#!/usr/bin/env bash
# Script de déploiement pour GPE Yale Backend
# Usage: ./deploy.sh [dev|prod] [start|stop|restart|logs|clean|env]

set -Eeuo pipefail

ENVIRONMENT=${1:-prod}
ACTION=${2:-start}

# --- Couleurs ---
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log()   { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $*${NC}"; }
warn()  { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $*${NC}"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*${NC}"; }
info()  { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $*${NC}"; }

# --- Paramètres ---
ENV_FILE=${ENV_FILE:-.env}
SERVICE=${SERVICE:-app}           # nom du service dans docker-compose.yml
PORT_MSG=${PORT_MSG:-3003}        # affichage d'info

# --- Détection binaire compose (v2 ou v1) ---
detect_compose() {
  if command -v docker &>/dev/null && docker compose version &>/dev/null; then
    COMPOSE_BIN="docker compose"
  elif command -v docker-compose &>/dev/null; then
    COMPOSE_BIN="docker-compose"
  else
    error "Docker Compose n'est pas installé (ni v2, ni v1)."
    exit 1
  fi
}

check_dependencies() {
  if ! command -v docker &>/dev/null; then
    error "Docker n'est pas installé"
    exit 1
  fi
  detect_compose
}

get_compose_file() {
  if [[ "$ENVIRONMENT" == "dev" ]]; then
    echo "docker-compose.dev.yml"
  else
    echo "docker-compose.yml"
  fi
}

COMPOSE_OPTS() {
  local compose_file="$1"
  local opts=()
  # --env-file si .env existe
  if [[ -f "$ENV_FILE" ]]; then
    opts+=( --env-file "$ENV_FILE" )
  else
    warn "Fichier $ENV_FILE introuvable. Les variables d'environnement ne seront pas injectées."
  fi
  opts+=( -f "$compose_file" )
  printf '%s ' "${opts[@]}"
}

create_directories() {
  log "Création des répertoires nécessaires..."
  mkdir -p logs ssl
}

check_ssl_certificates() { :; } # plus utilisé (pas de reverse proxy ici)

mask() {  # masque secrets dans l'aperçu
  local v="$1"
  [[ -z "$v" ]] && { echo "(vide)"; return; }
  local len=${#v}
  if (( len <= 4 )); then echo "***"; else echo "${v:0:2}***${v: -2}"; fi
}

preview_env() {
  if [[ ! -f "$ENV_FILE" ]]; then return; fi
  info "Aperçu des variables (.env) — sensibles masquées :"
  # lis sans interpréter, ignore lignes vides et commentaires
  local getv
  getv() { grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | tr -d '\r'; }
  local SMTP_HOST=$(getv SMTP_HOST)
  local SMTP_PORT=$(getv SMTP_PORT)
  local SMTP_SECURE=$(getv SMTP_SECURE)
  local EMAIL_USER=$(getv EMAIL_USER)
  local EMAIL_PASS=$(getv EMAIL_PASS)
  local EMAIL_FROM=$(getv EMAIL_FROM)
  local EMAIL_BCC=$(getv EMAIL_BCC)
  echo "  SMTP_HOST=$( [[ -n "$SMTP_HOST" ]] && echo "$SMTP_HOST" || echo '(défaut smtp.gmail.com)' )"
  echo "  SMTP_PORT=${SMTP_PORT:-587}"
  echo "  SMTP_SECURE=${SMTP_SECURE:-false}"
  echo "  EMAIL_USER=$(mask "$EMAIL_USER")"
  echo "  EMAIL_PASS=$(mask "$EMAIL_PASS")"
  echo "  EMAIL_FROM=${EMAIL_FROM:-'(vide → fallback sur EMAIL_USER)'}"
  echo "  EMAIL_BCC=$( [[ -n "$EMAIL_BCC" ]] && mask "$EMAIL_BCC" || echo '(non défini)' )"
}

container_id_for_service() {
  local compose_file="$1"
  $COMPOSE_BIN $(COMPOSE_OPTS "$compose_file") ps -q "$SERVICE"
}

show_container_env() {
  local compose_file="$1"
  local cid
  cid=$(container_id_for_service "$compose_file" || true)
  if [[ -n "$cid" ]]; then
    info "Variables SMTP/EMAIL visibles dans le conteneur ($SERVICE) :"
    docker exec -it "$cid" sh -lc 'printenv | egrep "^SMTP_|^EMAIL_" | sort || true'
  else
    warn "Conteneur pour le service '$SERVICE' introuvable (non démarré ?)."
  fi
}

start_services() {
  local compose_file
  compose_file=$(get_compose_file)
  log "Démarrage des services avec $compose_file..."
  preview_env
  $COMPOSE_BIN $(COMPOSE_OPTS "$compose_file") up -d
  log "Services démarrés avec succès !"
  info "Backend accessible sur: http://localhost:${PORT_MSG}"
  $COMPOSE_BIN $(COMPOSE_OPTS "$compose_file") ps
  show_container_env "$compose_file"
}

stop_services() {
  local compose_file
  compose_file=$(get_compose_file)
  log "Arrêt des services..."
  $COMPOSE_BIN $(COMPOSE_OPTS "$compose_file") down
  log "Services arrêtés."
}

restart_services() {
  log "Redémarrage des services..."
  stop_services
  start_services
}

show_logs() {
  local compose_file
  compose_file=$(get_compose_file)
  log "Affichage des logs du service '$SERVICE'..."
  $COMPOSE_BIN $(COMPOSE_OPTS "$compose_file") logs -f "$SERVICE"
}

clean_services() {
  local compose_file
  compose_file=$(get_compose_file)
  log "Nettoyage complet des services..."
  $COMPOSE_BIN $(COMPOSE_OPTS "$compose_file") down -v --remove-orphans
  docker system prune -f
  log "Nettoyage terminé."
}

show_help() {
  cat <<EOF
Script de déploiement GPE Yale Backend

Usage: $0 [ENVIRONMENT] [ACTION]

ENVIRONNEMENTS:
  dev   - Environnement de développement
  prod  - Environnement de production (défaut)

ACTIONS:
  start    - Démarrer les services (défaut)
  stop     - Arrêter les services
  restart  - Redémarrer les services
  logs     - Afficher les logs du service (SERVICE=app par défaut)
  clean    - Supprimer conteneurs/volumes orphelins
  env      - Afficher l'aperçu .env et l'env du conteneur
  help     - Afficher cette aide

Variables facultatives :
  ENV_FILE=.env      (fichier d'environnement à charger)
  SERVICE=app        (nom du service à cibler pour logs/env)
  PORT_MSG=3003      (port affiché dans le message d'info)

Exemples:
  $0 prod start
  SERVICE=app $0 prod logs
  ENV_FILE=.env.prod $0 prod restart
EOF
}

env_debug() {
  local compose_file
  compose_file=$(get_compose_file)
  preview_env
  show_container_env "$compose_file"
}

main() {
  case "${ACTION}" in
    help) show_help; exit 0 ;;
  esac

  check_dependencies
  create_directories
  [[ "$ENVIRONMENT" == "prod" ]] && check_ssl_certificates || true

  case "${ACTION}" in
    start)   start_services ;;
    stop)    stop_services ;;
    restart) restart_services ;;
    logs)    show_logs ;;
    clean)   clean_services ;;
    env)     env_debug ;;
    *)       error "Action inconnue: ${ACTION}"; show_help; exit 1 ;;
  esac
}

main
