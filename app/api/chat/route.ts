import { NextResponse } from 'next/server';
import { searchKnowledgeBase, SYSTEM_PROMPT } from '@/lib/knowledge-base';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { isTrialActive } from '@/lib/trial';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // 1. Rate-limiting (20 requêtes par heure)
    const rl = await rateLimit(`chat:${user.id}`, 20, 3600_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer d’ici une heure.' },
        { status: 429 }
      );
    }

    // 2. Premium Gate check
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_tier, created_at')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    const isTrial = isTrialActive(profile.created_at ?? undefined, profile.plan_tier);
    const isPremium = profile.plan_tier === 'premium' || profile.plan_tier === 'family' || isTrial;

    if (!isPremium) {
      return NextResponse.json(
        { error: 'Le module Chat Assistant est réservé aux membres Premium.' },
        { status: 403 }
      );
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1].content;
    const apiKey = process.env.OPENAI_API_KEY;

    // Si on a une clé API OpenAI, on fait l'appel réel
    if (apiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages,
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error('OpenAI API Error');
      }

      const data = await response.json();
      return NextResponse.json({
        role: 'assistant',
        content: data.choices[0].message.content,
      });
    }

    // No model key: answer from the local FAQ instead. This is a keyword
    // lookup, not a model — it used to sleep for a second first so it would
    // look like one, which is the same dishonesty as the simulated confidence
    // score this project already removed.
    const fallbackAnswer = searchKnowledgeBase(lastMessage);

    return NextResponse.json({
      role: 'assistant',
      content: fallbackAnswer,
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
