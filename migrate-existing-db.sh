#!/bin/bash

# Migration script to integrate existing PostgreSQL container with medical records system
# This script helps transition from your current setup to the full medical records system

echo "🏥 Medical Records System - Database Migration Script"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if existing PostgreSQL container is running
EXISTING_CONTAINER=$(docker ps --filter "ancestor=postgres:15.4" --format "{{.ID}}")
if [ -z "$EXISTING_CONTAINER" ]; then
    print_error "No PostgreSQL container found. Please start your existing PostgreSQL container first."
    exit 1
fi

print_success "Found existing PostgreSQL container: $EXISTING_CONTAINER"

# Step 1: Create the medical records database
print_status "Step 1: Creating 'historias_clinicas' database..."
docker exec $EXISTING_CONTAINER psql -U postgres -c "CREATE DATABASE historias_clinicas;" 2>/dev/null || {
    print_warning "Database 'historias_clinicas' might already exist. Continuing..."
}

# Step 2: Verify database creation
print_status "Step 2: Verifying database creation..."
docker exec $EXISTING_CONTAINER psql -U postgres -c "\l" | grep historias_clinicas && {
    print_success "Database 'historias_clinicas' is ready!"
} || {
    print_error "Failed to create database 'historias_clinicas'"
    exit 1
}

# Step 3: Stop the existing container (optional)
echo ""
print_warning "Step 3: Container Management Options"
echo "Your existing PostgreSQL container is currently running."
echo "You have two options:"
echo ""
echo "Option A: Keep existing container and connect new services to it"
echo "  - Pros: No data loss, immediate integration"
echo "  - Cons: Container name will be auto-generated (focused_brown)"
echo ""
echo "Option B: Stop existing container and use docker-compose setup"
echo "  - Pros: Clean setup, proper container names, networking"
echo "  - Cons: Need to restart container with new configuration"
echo ""

read -p "Choose option (A/B): " choice

case $choice in
    [Aa])
        print_status "Keeping existing container. New services will connect to it."
        print_status "Container ID: $EXISTING_CONTAINER"
        print_status "Container Name: $(docker ps --filter "id=$EXISTING_CONTAINER" --format "{{.Names}}")"
        
        # Create a custom compose file for existing container
        cat > docker-compose.existing.yml << EOF
version: '3.8'

services:
  python-backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: medical-records-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      # Connect to existing PostgreSQL container
      DATABASE_URL: postgresql://postgres:mysecretpassword@$EXISTING_CONTAINER:5432/historias_clinicas
      DB_HOST: $EXISTING_CONTAINER
      DB_PORT: 5432
      DB_NAME: historias_clinicas
      DB_USER: postgres
      DB_PASSWORD: mysecretpassword
      PYTHONPATH: /app
      PYTHONUNBUFFERED: 1
    networks:
      - bridge  # Use default bridge network
    volumes:
      - ./backend:/app
      - /app/__pycache__
    command: uvicorn main_clean_english:app --host 0.0.0.0 --port 8000 --reload

  typescript-frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: medical-records-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: http://localhost:8000
      REACT_APP_BACKEND_URL: http://medical-records-backend:8000
      CHOKIDAR_USEPOLLING: true
    depends_on:
      - python-backend
    networks:
      - bridge  # Use default bridge network
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm start

networks:
  bridge:
    external: true
EOF
        print_success "Created docker-compose.existing.yml for your setup"
        print_status "To start the application: docker-compose -f docker-compose.existing.yml up --build"
        ;;
        
    [Bb])
        print_status "Stopping existing container and preparing for clean setup..."
        
        # Stop the existing container
        docker stop $EXISTING_CONTAINER
        print_status "Stopped container: $EXISTING_CONTAINER"
        
        # Remove the container (data is preserved in volume)
        docker rm $EXISTING_CONTAINER
        print_status "Removed container: $EXISTING_CONTAINER"
        
        print_success "Ready for clean docker-compose setup!"
        print_status "To start the full application: docker-compose -f docker-compose.custom.yml up --build"
        ;;
        
    *)
        print_error "Invalid choice. Please run the script again and choose A or B."
        exit 1
        ;;
esac

# Step 4: Display next steps
echo ""
print_success "Migration completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. 🔧 Build and start the application:"
if [ "$choice" = "A" ] || [ "$choice" = "a" ]; then
    echo "   docker-compose -f docker-compose.existing.yml up --build"
else
    echo "   docker-compose -f docker-compose.custom.yml up --build"
fi
echo ""
echo "2. 🌐 Access the application:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:8000"
echo "   - API Docs: http://localhost:8000/docs"
echo ""
echo "3. 🗄️  Database connection details:"
echo "   - Host: localhost (or container IP)"
echo "   - Port: 5432"
echo "   - Database: historias_clinicas"
echo "   - User: postgres"
echo "   - Password: mysecretpassword"
echo ""
echo "4. 🏥 Initialize the medical records system:"
echo "   - Run database migrations"
echo "   - Create initial admin user"
echo "   - Import medical catalogs"
echo ""
print_success "Your medical records system is ready to deploy! 🚀"

