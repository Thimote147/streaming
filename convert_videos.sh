#!/bin/bash

# Script de conversion MKV/AVI vers MP4
# Usage: ./convert_videos.sh [source_path] [destination_path]
# Exemple: ./convert_videos.sh ~/Downloads/src ~/Downloads/dest

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration par défaut
DEFAULT_SOURCE="~/Downloads/src"
DEFAULT_DEST="~/Downloads/dest"
SSH_KEY="~/.ssh/streaming_key"

# Chemins spécifiques par catégorie
PATHS=(
    "~/Downloads/src"
)

# Fonction d'aide
show_help() {
    echo -e "${BLUE}Script de conversion MKV/AVI vers MP4${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS] [SOURCE] [DESTINATION]"
    echo ""
    echo "Arguments:"
    echo "  SOURCE      Chemin source (local ou SSH). Défaut: $DEFAULT_SOURCE"
    echo "  DEST        Dossier de destination. Défaut: $DEFAULT_DEST"
    echo ""
    echo "Options:"
    echo "  -h, --help                        Affiche cette aide"
    echo "  -a, --all                         Convertit tous les chemins configurés"
    echo "  -c, --category [nom]              Convertit une catégorie spécifique"
    echo "  -l, --list                        Liste les chemins configurés"
    echo "  -q, --quality [fast|medium|slow|best]  Qualité (défaut: best)"
    echo "  -t, --threads [nombre]            Nombre de threads (défaut: auto)"
    echo ""
    echo "Exemples:"
    echo "  $0 -a                                           # Convertit tous les chemins"
    echo "  $0 -c Films                                     # Convertit seulement les Films"
    echo "  $0 -l                                           # Liste les chemins disponibles"
    echo "  $0 /local/videos ~/Downloads                    # Conversion locale"
    echo "  $0 ~/Downloads/src ~/Downloads/dest                    # Conversion locale"
    echo ""
    echo "Chemins configurés:"
    for i in "${!PATHS[@]}"; do
        path="${PATHS[$i]}"
        category=$(basename "$path")
        echo "  - $category: $path"
    done
    echo ""
}

# Variables
SOURCE_PATH=""
DEST_PATH="$DEFAULT_DEST"
QUALITY="best"
THREADS="$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 8)"
MODE="single"  # single, all, category
CATEGORY=""

# Fonction pour lister les chemins
list_paths() {
    echo -e "${BLUE}Chemins configurés:${NC}"
    for i in "${!PATHS[@]}"; do
        path="${PATHS[$i]}"
        category=$(basename "$path")
        echo -e "  ${YELLOW}$category${NC}: $path"
    done
}

# Fonction pour trouver un chemin par catégorie
find_path_by_category() {
    local search_category="$1"
    for path in "${PATHS[@]}"; do
        category=$(basename "$path")
        if [[ "${category,,}" == "${search_category,,}" ]]; then
            echo "$path"
            return 0
        fi
    done
    return 1
}

# Traitement des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -a|--all)
            MODE="all"
            shift
            ;;
        -c|--category)
            MODE="category"
            CATEGORY="$2"
            shift 2
            ;;
        -l|--list)
            list_paths
            exit 0
            ;;
        -q|--quality)
            QUALITY="$2"
            shift 2
            ;;
        -t|--threads)
            THREADS="$2"
            shift 2
            ;;
        -*)
            echo -e "${RED}Option inconnue: $1${NC}"
            show_help
            exit 1
            ;;
        *)
            if [[ -z "$SOURCE_PATH" && "$MODE" == "single" ]]; then
                SOURCE_PATH="$1"
            elif [[ -z "$DEST_SET" ]]; then
                DEST_PATH="$1"
                DEST_SET=1
            fi
            shift
            ;;
    esac
done

# Configuration selon le mode
case $MODE in
    "single")
        if [[ -z "$SOURCE_PATH" ]]; then
            SOURCE_PATH="$DEFAULT_SOURCE"
        fi
        SOURCES=("$SOURCE_PATH")
        ;;
    "all")
        SOURCES=("${PATHS[@]}")
        ;;
    "category")
        if [[ -z "$CATEGORY" ]]; then
            echo -e "${RED}❌ Nom de catégorie requis avec -c${NC}"
            exit 1
        fi
        CATEGORY_PATH=$(find_path_by_category "$CATEGORY")
        if [[ $? -ne 0 ]]; then
            echo -e "${RED}❌ Catégorie '$CATEGORY' non trouvée${NC}"
            echo -e "${YELLOW}Catégories disponibles:${NC}"
            for path in "${PATHS[@]}"; do
                echo "  - $(basename "$path")"
            done
            exit 1
        fi
        SOURCES=("$CATEGORY_PATH")
        ;;
esac

# Expansion du tilde
DEST_PATH="${DEST_PATH/#\~/$HOME}"

echo -e "${BLUE}=== Conversion MKV/AVI vers MP4 ===${NC}"
case $MODE in
    "single")
        echo -e "Mode: ${YELLOW}Source unique${NC}"
        echo -e "Source: ${YELLOW}${SOURCES[0]}${NC}"
        ;;
    "all")
        echo -e "Mode: ${YELLOW}Tous les chemins (${#SOURCES[@]} dossiers)${NC}"
        ;;
    "category")
        echo -e "Mode: ${YELLOW}Catégorie '$CATEGORY'${NC}"
        echo -e "Source: ${YELLOW}${SOURCES[0]}${NC}"
        ;;
esac
echo -e "Destination: ${YELLOW}$DEST_PATH${NC}"
echo -e "Qualité: ${YELLOW}$QUALITY${NC} (CRF: $(case $QUALITY in "fast") echo "28";; "medium") echo "23";; "slow") echo "20";; "best") echo "18";; *) echo "18";; esac))"
echo -e "Threads: ${YELLOW}$THREADS${NC}"
echo ""

# Vérification de FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}❌ FFmpeg n'est pas installé !${NC}"
    echo "Installation:"
    echo "  macOS: brew install ffmpeg"
    echo "  Ubuntu: sudo apt install ffmpeg"
    exit 1
fi

# Création du dossier de destination
mkdir -p "$DEST_PATH"

# Fonction pour obtenir la liste des fichiers à convertir
get_file_list() {
    local source_path="$1"
    if [[ "$source_path" == *":"* ]]; then
        # SSH
        ssh -i "$SSH_KEY" "${source_path%:*}" "find '${source_path#*:}' -type f \( -iname '*.mkv' -o -iname '*.avi' \) 2>/dev/null | head -100"
    else
        # Local
        find "$source_path" -type f \( -iname "*.mkv" -o -iname "*.avi" \) 2>/dev/null | head -100
    fi
}

# Fonction de conversion
convert_file() {
    local src_file="$1"
    local current_source="$2"
    local filename=$(basename "$src_file")
    local name_without_ext="${filename%.*}"
    
    # Créer sous-dossier par catégorie si mode all
    local category_dest="$DEST_PATH"
    if [[ "$MODE" == "all" ]]; then
        local category=$(basename "$current_source")
        category_dest="$DEST_PATH/$category"
        mkdir -p "$category_dest"
    fi
    
    local dest_file="$category_dest/${name_without_ext}.mp4"
    
    # Skip si le fichier existe déjà
    if [[ -f "$dest_file" ]]; then
        echo -e "${YELLOW}⏭️  Ignoré (existe): $filename${NC}"
        return 0
    fi
    
    echo -e "${BLUE}🔄 Conversion: $filename${NC}"
    
    # Configuration FFmpeg selon la qualité
    case $QUALITY in
        "fast")
            preset="ultrafast"
            crf="28"
            ;;
        "medium")
            preset="fast"
            crf="23"
            ;;
        "slow")
            preset="slow"
            crf="20"
            ;;
        "best")
            preset="veryslow"
            crf="18"
            ;;
        *)
            preset="veryslow"
            crf="18"
            ;;
    esac
    
    # Commande de conversion
    if [[ "$current_source" == *":"* ]]; then
        # SSH: Stream depuis le serveur
        ssh -i "$SSH_KEY" "${current_source%:*}" "cat '$src_file'" | \
        ffmpeg -i pipe:0 \
               -c:v libx264 -preset "$preset" -crf "$crf" -tune film \
               -c:a aac -b:a 320k \
               -threads "$THREADS" \
               -movflags +faststart \
               -y "$dest_file" \
               -loglevel warning -stats
    else
        # Local
        ffmpeg -i "$src_file" \
               -c:v libx264 -preset "$preset" -crf "$crf" -tune film \
               -c:a aac -b:a 320k \
               -threads "$THREADS" \
               -movflags +faststart \
               -y "$dest_file" \
               -loglevel warning -stats
    fi
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Terminé: ${name_without_ext}.mp4${NC}"
        
        # Affichage des tailles
        if [[ "$current_source" != *":"* ]]; then
            src_size=$(du -h "$src_file" | cut -f1)
            dest_size=$(du -h "$dest_file" | cut -f1)
            echo -e "   📊 Taille: $src_size → $dest_size"
        fi
    else
        echo -e "${RED}❌ Erreur lors de la conversion de $filename${NC}"
        return 1
    fi
}

# Traitement de tous les sources
echo -e "${BLUE}🔍 Recherche des fichiers...${NC}"

total_converted=0
total_failed=0
total_files=0
start_time=$(date +%s)

for current_source in "${SOURCES[@]}"; do
    if [[ "$MODE" == "all" ]]; then
        category=$(basename "$current_source")
        echo -e "${BLUE}📂 Traitement de la catégorie: ${YELLOW}$category${NC}"
    fi
    
    file_list=$(get_file_list "$current_source")
    
    if [[ -z "$file_list" ]]; then
        echo -e "${YELLOW}⚠️  Aucun fichier MKV/AVI trouvé dans $current_source${NC}"
        continue
    fi
    
    # Affichage de la liste pour cette source
    file_count=$(echo "$file_list" | wc -l)
    total_files=$((total_files + file_count))
    echo -e "${GREEN}📁 $file_count fichier(s) trouvé(s) à convertir:${NC}"
    echo "$file_list" | while read -r file; do
        echo "  - $(basename "$file")"
    done
    echo ""
done

if [[ $total_files -eq 0 ]]; then
    echo -e "${YELLOW}⚠️  Aucun fichier MKV/AVI trouvé dans les sources${NC}"
    exit 0
fi

echo -e "${GREEN}📊 Total: $total_files fichier(s) à convertir${NC}"
echo ""

# Confirmation
read -p "Continuer la conversion ? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Annulé.${NC}"
    exit 0
fi

# Conversion
echo -e "${BLUE}🚀 Début de la conversion...${NC}"
echo ""

for current_source in "${SOURCES[@]}"; do
    if [[ "$MODE" == "all" ]]; then
        category=$(basename "$current_source")
        echo -e "${BLUE}🔄 Conversion de la catégorie: ${YELLOW}$category${NC}"
    fi
    
    file_list=$(get_file_list "$current_source")
    [[ -z "$file_list" ]] && continue
    
    converted=0
    failed=0
    
    while IFS= read -r file; do
        [[ -z "$file" ]] && continue
        
        if convert_file "$file" "$current_source"; then
            ((converted++))
            ((total_converted++))
        else
            ((failed++))
            ((total_failed++))
        fi
        echo ""
    done <<< "$file_list"
    
    if [[ "$MODE" == "all" ]]; then
        echo -e "${BLUE}📋 Résumé $category: ${GREEN}✅ $converted${NC} | ${RED}❌ $failed${NC}"
        echo ""
    fi
done

# Résumé final
end_time=$(date +%s)
duration=$((end_time - start_time))
minutes=$((duration / 60))
seconds=$((duration % 60))

echo -e "${BLUE}=== Résumé Final ===${NC}"
echo -e "${GREEN}✅ Convertis: $total_converted${NC}"
echo -e "${RED}❌ Échecs: $total_failed${NC}"
echo -e "⏱️  Durée totale: ${minutes}m ${seconds}s"
echo -e "📁 Destination: $DEST_PATH"

if [[ "$MODE" == "all" ]]; then
    echo -e "${BLUE}📊 Répartition par catégorie:${NC}"
    for source in "${SOURCES[@]}"; do
        category=$(basename "$source")
        if [[ -d "$DEST_PATH/$category" ]]; then
            count=$(find "$DEST_PATH/$category" -name "*.mp4" 2>/dev/null | wc -l)
            echo -e "  - ${YELLOW}$category${NC}: $count fichier(s)"
        fi
    done
fi

if [[ $total_converted -gt 0 ]]; then
    echo -e "${GREEN}🎉 Conversion terminée avec succès !${NC}"
fi