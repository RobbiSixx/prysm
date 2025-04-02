#!/bin/bash

# ██████╗ ██████╗ ██╗   ██╗███████╗███╗   ███╗     █████╗ ██████╗ ██╗
# ██╔══██╗██╔══██╗╚██╗ ██╔╝██╔════╝████╗ ████║    ██╔══██╗██╔══██╗██║
# ██████╔╝██████╔╝ ╚████╔╝ ███████╗██╔████╔██║    ███████║██████╔╝██║
# ██╔═══╝ ██╔══██╗  ╚██╔╝  ╚════██║██║╚██╔╝██║    ██╔══██║██╔═══╝ ██║
# ██║     ██║  ██║   ██║   ███████║██║ ╚═╝ ██║    ██║  ██║██║     ██║
# ╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝     ╚═╝    ╚═╝  ╚═╝╚═╝     ╚═╝
#
# 🔍 Structure-Aware Web Scraper API Setup

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
RESET='\033[0m'
BOLD='\033[1m'

# Print header
echo -e "${MAGENTA}${BOLD}"
echo -e "██████╗ ██████╗ ██╗   ██╗███████╗███╗   ███╗     █████╗ ██████╗ ██╗"
echo -e "██╔══██╗██╔══██╗╚██╗ ██╔╝██╔════╝████╗ ████║    ██╔══██╗██╔══██╗██║"
echo -e "██████╔╝██████╔╝ ╚████╔╝ ███████╗██╔████╔██║    ███████║██████╔╝██║"
echo -e "██╔═══╝ ██╔══██╗  ╚██╔╝  ╚════██║██║╚██╔╝██║    ██╔══██║██╔═══╝ ██║"
echo -e "██║     ██║  ██║   ██║   ███████║██║ ╚═╝ ██║    ██║  ██║██║     ██║"
echo -e "╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝     ╚═╝    ╚═╝  ╚═╝╚═╝     ╚═╝"
echo -e "${RESET}"
echo -e "${BLUE}🔍 Structure-Aware Web Scraper API Setup${RESET}"
echo -e "${CYAN}✨ Dream it, Pixel it | Made with ❤️  by Pink Pixel${RESET}"
echo ""

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if npm is installed
if ! command_exists npm; then
  echo -e "${RED}Error: npm is not installed. Please install Node.js and npm first.${RESET}"
  exit 1
fi

echo -e "${YELLOW}Installing API dependencies...${RESET}"

# Install required dependencies
npm install --no-save express swagger-ui-express express-openapi-validator axios cors js-yaml

# Create API directories if they don't exist
echo -e "${YELLOW}Setting up API directories...${RESET}"
mkdir -p main_results/api

echo -e "${GREEN}${BOLD}✅ API setup complete!${RESET}"
echo ""
echo -e "${CYAN}To start the API server:${RESET}"
echo -e "  ${BLUE}npm run start:api${RESET}"
echo ""
echo -e "${CYAN}API documentation will be available at:${RESET}"
echo -e "  ${BLUE}http://localhost:3000/api-docs${RESET}"
echo ""
echo -e "${YELLOW}Note: Make sure you have already installed the core dependencies with${RESET} ${BLUE}npm install${RESET}" 