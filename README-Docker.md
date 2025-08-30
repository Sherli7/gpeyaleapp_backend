# Déploiement Docker - GPE Yale Backend

Ce guide explique comment déployer l'application backend GPE Yale avec Docker et Docker Compose.

## 📋 Prérequis

- Docker installé
- Docker Compose installé
- Git (pour cloner le projet)

## 🚀 Démarrage Rapide

### 1. Configuration des variables d'environnement

```bash
# Copier le fichier d'exemple
cp env.example .env

# Éditer le fichier .env avec vos configurations
nano .env
```

### 2. Démarrage en mode développement

```bash
# Utiliser le script de déploiement
./deploy.sh dev start

# Ou directement avec Docker Compose
docker-compose -f docker-compose.dev.yml up -d
```

### 3. Démarrage en mode production

```bash
# Utiliser le script de déploiement
./deploy.sh prod start

# Ou directement avec Docker Compose
docker-compose --profile production up -d
```

## 📁 Structure des fichiers Docker

```
├── docker-compose.yml          # Configuration production
├── docker-compose.dev.yml      # Configuration développement
├── Dockerfile                  # Image production
├── Dockerfile.dev              # Image développement
├── nginx.conf                  # Configuration Nginx
├── healthcheck.js              # Script de health check
├── deploy.sh                   # Script de déploiement
├── env.example                 # Exemple de variables d'environnement
├── .dockerignore               # Fichiers exclus du build
└── README-Docker.md           # Ce fichier
```

## 🔧 Configuration des Variables d'Environnement

### Fichier .env

Créez un fichier `.env` à la racine du projet en vous basant sur `env.example` :

```bash
# Configuration de base
NODE_ENV=production
PORT=3003
FRONTEND_URL=https://gpe-yale.edocsflow.com

# Base de données
DB_HOST=host.docker.internal
DB_PORT=5433
DB_USERNAME=postgres
DB_PASSWORD=your_password_here
DB_NAME=gpe_yale

# CORS
CORS_ORIGINS=http://localhost:4200,https://gpe-yale.edocsflow.com

# SMTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="Admissions <no-reply@example.com>"
```

### Variables importantes

| Variable | Description | Défaut |
|----------|-------------|---------|
| `NODE_ENV` | Environnement (development/production) | production |
| `PORT` | Port du serveur | 3003 |
| `FRONTEND_URL` | URL du frontend | https://gpe-yale.edocsflow.com |
| `DB_HOST` | Hôte PostgreSQL | host.docker.internal |
| `DB_PORT` | Port PostgreSQL | 5433 |
| `DB_PASSWORD` | Mot de passe PostgreSQL | - |
| `CORS_ORIGINS` | Origines CORS autorisées | - |
| `EMAIL_HOST` | Serveur SMTP | smtp.gmail.com |
| `EMAIL_USER` | Utilisateur SMTP | - |
| `EMAIL_PASS` | Mot de passe SMTP | - |

## 🐳 Commandes Docker

### Script de déploiement

```bash
# Afficher l'aide
./deploy.sh help

# Développement
./deploy.sh dev start    # Démarrer
./deploy.sh dev stop     # Arrêter
./deploy.sh dev logs     # Voir les logs
./deploy.sh dev restart  # Redémarrer

# Production
./deploy.sh prod start   # Démarrer
./deploy.sh prod stop    # Arrêter
./deploy.sh prod logs    # Voir les logs
./deploy.sh prod restart # Redémarrer

# Nettoyage
./deploy.sh clean        # Nettoyer tout
```

### Commandes Docker Compose directes

```bash
# Développement
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml logs -f

# Production
docker-compose --profile production up -d
docker-compose --profile production down
docker-compose --profile production logs -f
```

## 🔍 Vérification du déploiement

### Vérifier les services

```bash
# Lister les conteneurs
docker ps

# Vérifier les logs
docker-compose logs backend
docker-compose logs postgres
```

### Tests de connectivité

```bash
# Test de l'API
curl http://localhost:3003/api/health

# Test de la base de données
docker exec gpyaleappback pg_isready -U postgres -h host.docker.internal -p 5433
```

## 🔒 Configuration SSL (Production)

### Certificats auto-signés (développement)

Le script `deploy.sh` génère automatiquement des certificats auto-signés.

### Certificats réels (production)

1. Placez vos certificats dans le dossier `ssl/` :
   ```bash
   ssl/
   ├── cert.pem    # Certificat public
   └── key.pem     # Clé privée
   ```

2. Modifiez `nginx.conf` si nécessaire pour adapter les chemins.

## 📊 Monitoring et Logs

### Logs des applications

```bash
# Logs en temps réel
docker-compose logs -f app

# Logs avec timestamps
docker-compose logs -f --timestamps app
```

### Logs sur le système hôte

Les logs sont également disponibles dans le dossier `logs/` :

```bash
tail -f logs/app.log
```

## 🛠️ Dépannage

### Problèmes courants

1. **Port déjà utilisé**
   ```bash
   # Vérifier les ports utilisés
   netstat -tulpn | grep :3003
   
   # Modifier le port dans .env
   PORT=3004
   ```

2. **Base de données non accessible**
   ```bash
   # Vérifier la connexion
   docker exec gpyaleappback psql -U postgres -h host.docker.internal -p 5433 -d gpe_yale -c "SELECT 1;"
   ```

3. **Variables d'environnement non chargées**
   ```bash
   # Vérifier le fichier .env
   cat .env
   
   # Vérifier les variables dans le conteneur
   docker exec gpyaleappback env | grep DB_
   ```

### Réinitialisation complète

```bash
# Arrêter et supprimer tout
./deploy.sh clean

# Supprimer les volumes (si nécessaire)
docker volume prune

# Redémarrer
./deploy.sh dev start
```

## 🔄 Mise à jour

### Mise à jour du code

```bash
# Arrêter les services
./deploy.sh dev stop

# Récupérer les dernières modifications
git pull

# Reconstruire et redémarrer
./deploy.sh dev start
```

### Mise à jour des dépendances

```bash
# Reconstruire l'image
docker-compose -f docker-compose.dev.yml build --no-cache

# Redémarrer
./deploy.sh dev restart
```

## 📝 Notes importantes

- Le fichier `.env` ne doit **jamais** être commité dans Git
- L'application se connecte à PostgreSQL sur l'hôte via `host.docker.internal`
- En développement, les volumes montent le code source pour le hot-reload
- L'application utilise le port 3003 par défaut

## 🆘 Support

En cas de problème :

1. Vérifiez les logs : `./deploy.sh dev logs`
2. Vérifiez la configuration : `cat .env`
3. Vérifiez les conteneurs : `docker ps`
4. Consultez la documentation de l'application principale
