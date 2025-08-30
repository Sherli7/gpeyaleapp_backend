#!/bin/bash

# Script de déploiement pour GPE Yale Backend
# Usage: ./deploy.sh [dev|prod] [start|stop|restart|logs|clean]

set -e

ENVIRONMENT=${1:-prod}
ACTION=${2:-start}

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Vérifier que Docker et Docker Compose sont installés
check_dependencies() {
    if ! command -v docker &> /dev/null; then
        error "Docker n'est pas installé"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose n'est pas installé"
        exit 1
    fi
}

# Déterminer le fichier de configuration à utiliser
get_compose_file() {
    if [ "$ENVIRONMENT" = "dev" ]; then
        echo "docker-compose.dev.yml"
    else
        echo "docker-compose.yml"
    fi
}

# Créer les répertoires nécessaires
create_directories() {
    log "Création des répertoires nécessaires..."
    mkdir -p logs
    mkdir -p ssl
}

# Vérifier les certificats SSL pour la production
check_ssl_certificates() {
    # Cette fonction n'est plus nécessaire car nous n'utilisons plus Nginx
    return 0
}

# Fonction pour démarrer les services
start_services() {
    local compose_file=$(get_compose_file)
    log "Démarrage des services avec $compose_file..."
    
    docker-compose -f $compose_file up -d
    
    log "Services démarrés avec succès!"
    info "Backend accessible sur: http://localhost:3003"
}

# Fonction pour arrêter les services
stop_services() {
    local compose_file=$(get_compose_file)
    log "Arrêt des services..."
    docker-compose -f $compose_file down
    log "Services arrêtés!"
}

# Fonction pour redémarrer les services
restart_services() {
    log "Redémarrage des services..."
    stop_services
    start_services
}

# Fonction pour afficher les logs
show_logs() {
    local compose_file=$(get_compose_file)
    log "Affichage des logs..."
    docker-compose -f $compose_file logs -f
}

# Fonction pour nettoyer
clean_services() {
    local compose_file=$(get_compose_file)
    log "Nettoyage complet des services..."
    docker-compose -f $compose_file down -v --remove-orphans
    docker system prune -f
    log "Nettoyage terminé!"
}

# Fonction pour afficher l'aide
show_help() {
    echo "Script de déploiement GPE Yale Backend"
    echo ""
    echo "Usage: $0 [ENVIRONMENT] [ACTION]"
    echo ""
    echo "ENVIRONNEMENTS:"
    echo "  dev   - Environnement de développement"
    echo "  prod  - Environnement de production (défaut)"
    echo ""
    echo "ACTIONS:"
    echo "  start   - Démarrer les services (défaut)"
    echo "  stop    - Arrêter les services"
    echo "  restart - Redémarrer les services"
    echo "  logs    - Afficher les logs"
    echo "  clean   - Nettoyer complètement (volumes, images)"
    echo "  help    - Afficher cette aide"
    echo ""
    echo "EXEMPLES:"
    echo "  $0 dev start    # Démarrer en mode développement"
    echo "  $0 prod start   # Démarrer en mode production"
    echo "  $0 dev logs     # Voir les logs en développement"
    echo "  $0 clean        # Nettoyer tout"
}

# Script principal
main() {
    case $ACTION in
        "help")
            show_help
            exit 0
            ;;
    esac
    
    check_dependencies
    create_directories
    
    # Vérifications spécifiques à l'environnement
    if [ "$ENVIRONMENT" = "prod" ]; then
        check_ssl_certificates
    fi
    
    case $ACTION in
        "start")
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "logs")
            show_logs
            ;;
        "clean")
            clean_services
            ;;
        *)
            error "Action inconnue: $ACTION"
            show_help
            exit 1
            ;;
    esac
}

# Exécuter le script principal
main
