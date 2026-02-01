#!/bin/bash
# Script helper para desarrollo rápido del agente
# Uso: ./scripts/dev_agent.sh [comando]

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Encontrar la raíz del proyecto (donde está docker-compose.dev.yml)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Ir a la raíz del proyecto (dos niveles arriba desde backend/scripts/)
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

case "${1:-help}" in
  build)
    echo -e "${BLUE}🔨 Building Docker image with BuildKit cache...${NC}"
    export DOCKER_BUILDKIT=1
    export COMPOSE_DOCKER_CLI_BUILD=1
    docker-compose -f docker-compose.dev.yml build python-backend
    echo -e "${GREEN}✅ Build complete!${NC}"
    ;;
  
  up)
    echo -e "${BLUE}🚀 Starting services...${NC}"
    docker-compose -f docker-compose.dev.yml up -d
    echo -e "${GREEN}✅ Services started!${NC}"
    echo -e "${YELLOW}💡 Run 'dev_agent.sh logs' to see logs${NC}"
    ;;
  
  down)
    echo -e "${BLUE}🛑 Stopping services...${NC}"
    docker-compose -f docker-compose.dev.yml down
    echo -e "${GREEN}✅ Services stopped!${NC}"
    ;;
  
  restart)
    echo -e "${BLUE}🔄 Restarting backend...${NC}"
    docker-compose -f docker-compose.dev.yml restart python-backend
    echo -e "${GREEN}✅ Backend restarted!${NC}"
    ;;
  
  logs)
    echo -e "${BLUE}📋 Showing logs (Ctrl+C to exit)...${NC}"
    docker-compose -f docker-compose.dev.yml logs -f python-backend
    ;;
  
  test)
    echo -e "${BLUE}🧪 Testing agent...${NC}"
    docker-compose -f docker-compose.dev.yml exec python-backend \
      python /app/scripts/test_bot.py "${@:2}"
    ;;
  
  test-interactive)
    echo -e "${BLUE}🧪 Testing agent interactively...${NC}"
    docker-compose -f docker-compose.dev.yml exec -it python-backend \
      python /app/scripts/test_bot.py
    ;;
  
  shell)
    echo -e "${BLUE}🐚 Opening shell in container...${NC}"
    docker-compose -f docker-compose.dev.yml exec python-backend /bin/bash
    ;;
  
  clean)
    echo -e "${YELLOW}🧹 Cleaning Docker cache and volumes...${NC}"
    read -p "This will remove unused images and volumes. Continue? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      docker-compose -f docker-compose.dev.yml down -v
      docker system prune -f
      echo -e "${GREEN}✅ Cleanup complete!${NC}"
    fi
    ;;
  
  help|*)
    echo -e "${BLUE}🤖 Agent Development Helper${NC}"
    echo ""
    echo "Usage: ./scripts/dev_agent.sh [command]"
    echo ""
    echo "Commands:"
    echo "  build          Build Docker image (with BuildKit cache)"
    echo "  up             Start all services"
    echo "  down           Stop all services"
    echo "  restart        Restart backend service"
    echo "  logs           Show backend logs (follow mode)"
    echo "  test           Run agent tests"
    echo "  test-interactive  Run interactive agent tests"
    echo "  shell          Open shell in backend container"
    echo "  clean          Clean Docker cache and volumes"
    echo "  help           Show this help"
    echo ""
    echo "Examples:"
    echo "  ./scripts/dev_agent.sh build"
    echo "  ./scripts/dev_agent.sh up"
    echo "  ./scripts/dev_agent.sh test"
    echo "  ./scripts/dev_agent.sh test-interactive"
    ;;
esac
