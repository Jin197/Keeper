# 💾 Stratégie de Sauvegarde, Restauration & Résilience · Keeper

Ce guide décrit la politique de sauvegarde automatisée, les procédures de restauration validées, la synchronisation sécurisée des pièces justificatives sur notre stockage privé, et les processus d'audit continu de la plateforme Keeper.

---

## 📅 1. Backups Quotidiens Automatisés (Supabase PostgreSQL)

### A. Solution Native Supabase (Recommandée pour la Production)
Sur les plans **Pro** et **Enterprise** de Supabase, les sauvegardes de la base de données PostgreSQL sont entièrement automatisées et gérées à l'échelle physique :
* **Fréquence** : Quotidienne.
* **Rétention** : 7 jours (Plan Pro) à 30 jours (Plan Enterprise).
* **Contenu** : Base de données complète (y compris les schémas `public`, `storage`, `auth`, etc.).
* **Configuration** : Rien à faire côté serveur, activé par défaut dans le panneau d'administration de l'organisation.

### B. Solution Fallback Automatisée (Plan Gratuit ou Auto-Hébergé)
Si vous utilisez l'infrastructure sur un plan gratuit ou auto-hébergé, vous devez configurer un script de sauvegarde automatique via un cron externe.

**Script de backup quotidien (`scripts/backup-db.sh`)** :
```bash
#!/bin/bash
# Configuration
DB_HOST="aws-0-eu-west-3.pooler.supabase.com" # Remplacez par votre hôte
DB_NAME="postgres"
DB_USER="postgres.your-project-id"
BACKUP_DIR="/var/backups/keeper"
DATE=$(date +\%Y-\%m-\%d_\%H-\%M-\%S)
FILENAME="${BACKUP_DIR}/keeper_backup_${DATE}.sql.gz"

# Créer le répertoire si nécessaire
mkdir -p "${BACKUP_DIR}"

# Export PostgreSQL compacté via pg_dump
PGPASSWORD="${SUPABASE_DB_PASSWORD}" pg_dump -h "${DB_HOST}" -p 5432 -U "${DB_USER}" -d "${DB_NAME}" --clean --no-owner --no-privileges | gzip > "${FILENAME}"

# Rétention locale : Supprimer les sauvegardes de plus de 30 jours
find "${BACKUP_DIR}" -type f -name "keeper_backup_*.sql.gz" -mtime +30 -delete

echo "Backup PostgreSQL terminé : ${FILENAME}"
```

**Planification Cron (Tous les jours à 03:00 du matin)** :
```cron
0 3 * * * /bin/bash /Users/jinola/Autocar_app/scripts/backup-db.sh >> /var/log/keeper-backup.log 2>&1
```

---

## 🔄 2. Procédure Claire de Restauration de Données (Validée en Dev)

En cas d'incident critique, de corruption de données ou de déploiement défectueux, suivez cette procédure de restauration étape par étape.

### A. Restauration via l'interface Supabase Dashboard
1. Rendez-vous sur votre panneau d'administration **Supabase**.
2. Allez dans **Settings** -> **Database** -> **Backups**.
3. Choisissez la date de sauvegarde souhaitée (la plus proche avant l'incident).
4. Cliquez sur **Restore** et patientez pendant la restauration physique.

### B. Restauration manuelle en local (ou sur plan gratuit / dev)
Pour restaurer un fichier SQL compressé généré par `pg_dump` :

1. **Décompresser le fichier de sauvegarde** :
   ```bash
   gunzip keeper_backup_2026-05-23_03-00-00.sql.gz
   ```

2. **Exécuter la restauration PostgreSQL** (ceci nettoie et reconstruit les schémas existants grâce au drapeau `--clean` du dump) :
   ```bash
   PGPASSWORD="VotreMotDePasseSupabase" psql \
     -h aws-0-eu-west-3.pooler.supabase.com \
     -p 5432 \
     -U postgres.your-project-id \
     -d postgres \
     -f keeper_backup_2026-05-23_03-00-00.sql
   ```

3. **Vérification d'intégrité après restauration** :
   Connectez-vous à la base de données et exécutez un décompte rapide des tables clés pour s'assurer que les enregistrements sont revenus :
   ```sql
   SELECT count(*) FROM public.profiles;
   SELECT count(*) FROM public.vehicles;
   ```

---

## 🔒 3. Synchronisation en Temps Réel des Factures (Supabase Storage Privé)

Toutes les pièces justificatives d'entretien et les reçus d'énergie de Keeper sont **100 % sécurisés** :

* **Configuration Buckets Privés (`supabase/migrations/20260509120300_storage_buckets.sql`)** :
  * Les buckets `invoices` (factures) et `receipts` (reçus d'énergie) sont créés avec le drapeau `public = false`. **Aucun accès anonyme direct sur le web n'est autorisé.**
  * Limite de taille stricte : 10 Mo pour les factures (formats JPEG, PNG, PDF) et 5 Mo pour les reçus d'énergie.
* **Sécurité RLS Double Couche** :
  * Les politiques RLS de Supabase Storage vérifient dynamiquement que l'identifiant du dossier correspond exactement à l'identifiant de l'utilisateur connecté (`auth.uid()`) :
    ```sql
    create policy "invoices_owner_read" on storage.objects
      for select using (
        bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text
      );
    ```
  * En production, les fichiers sont stockés sous la forme `{user_id}/{unique_file_id}.pdf` et servis via des **URLs signées temporaires expirant au bout d'une heure**, éliminant tout risque d'exposition publique ou d'indexation SEO.

---

## 🧪 4. Audit RLS Continu dans le Pipeline CI/CD

Pour éviter toute régression de sécurité lors de nouvelles fonctionnalités, le script d'audit automatisé de sécurité RLS est exécuté à chaque phase de build :

* **Commande** :
  ```bash
  npm run audit:rls
  ```
* **Statut Exit 0** :
  * Le script `tests/audit/rls-audit.mjs` simule un utilisateur A et un utilisateur B, tente de contourner les politiques RLS en effectuant des requêtes croisées, et teste les blocages d'édition de l'historique inaltérable de maintenance.
  * Si une politique RLS est manquante ou contournable, le script renvoie un statut d'erreur **Exit 1**, bloquant immédiatement le déploiement ou l'intégration continue.
  * S'il réussit, il renvoie **Exit 0**, validant la sécurité et permettant le build de production.
