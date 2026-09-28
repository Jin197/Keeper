import { Link } from '@/lib/i18n/routing';
import { Plus, Car } from 'lucide-react';
import { PageHeader } from '@/components/domain/page-header';
import { VehicleCard } from '@/components/domain/vehicle-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getVehicles } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

const TRANSLATIONS = {
  fr: {
    title: "Vos véhicules",
    desc: (count: number) => `${count} véhicule${count > 1 ? 's' : ''} dans votre flotte`,
    noVehicle: "Aucun véhicule pour l'instant",
    noVehicleDesc: "Ajoutez votre premier véhicule pour commencer le suivi du coût au km.",
    addVehicle: "Ajouter un véhicule"
  },
  en: {
    title: "Your vehicles",
    desc: (count: number) => `${count} vehicle${count > 1 ? 's' : ''} in your fleet`,
    noVehicle: "No vehicles yet",
    noVehicleDesc: "Add your first vehicle to start tracking your cost per kilometer.",
    addVehicle: "Add a vehicle"
  },
  es: {
    title: "Tus vehículos",
    desc: (count: number) => `${count} vehículo${count > 1 ? 's' : ''} en tu flota`,
    noVehicle: "Ningún vehículo por el momento",
    noVehicleDesc: "Añade tu primer vehículo para empezar a realizar el seguimiento del coste por km.",
    addVehicle: "Añadir un vehículo"
  },
  ar: {
    title: "مركباتك",
    desc: (count: number) => `${count} مركبة في أسطولك`,
    noVehicle: "لا توجد مركبات حالياً",
    noVehicleDesc: "أضف مركبتك الأولى للبدء في تتبع التكلفة لكل كيلومتر.",
    addVehicle: "إضافة مركبة"
  },
  pt: {
    title: "Seus veículos",
    desc: (count: number) => `${count} veículo${count > 1 ? 's' : ''} na sua frota`,
    noVehicle: "Nenhum veículo no momento",
    noVehicleDesc: "Adicione o seu primeiro veículo para começar a acompanhar o custo por km.",
    addVehicle: "Adicionar um veículo"
  }
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function VehiclesPage({ params }: PageProps) {
  const { locale } = await params;
  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  const vehicles = isSupabaseConfigured() ? await getVehicles() : [];

  if (vehicles.length === 0) {
    return (
      <div className="container py-12">
        <Card className="p-10 max-w-xl mx-auto text-center">
          <div className="rounded-full bg-keeper/10 text-keeper h-14 w-14 mx-auto flex items-center justify-center">
            <Car className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-xl font-bold mt-5">
            {t.noVehicle}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t.noVehicleDesc}
          </p>
          <Button asChild className="mt-5">
            <Link href="/vehicles/new">
              <Plus className="h-4 w-4" /> {t.addVehicle}
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 lg:py-8 space-y-6">
      <PageHeader
        title={t.title}
        description={t.desc(vehicles.length)}
        action={
          <Button asChild>
            <Link href="/vehicles/new">
              <Plus className="h-4 w-4" /> {t.addVehicle}
            </Link>
          </Button>
        }
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((v) => (
          <VehicleCard key={v.id} vehicle={v} />
        ))}
      </div>
    </div>
  );
}
