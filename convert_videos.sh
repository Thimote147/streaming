#!/bin/bash

# Script de conversion MKV/AVI vers MP4 - Optimisé pour vitesse maximale
# Usage: ./convert_videos.sh [OPTIONS] [SOURCE] [DESTINATION]

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration par défaut
DEFAULT_SOURCE="ssh thim@ssh.thimotefetu.fr:/mnt/streaming"
DEFAULT_DEST="$HOME/Downloads/dest"
SSH_KEY="$HOME/.ssh/streaming_key"

# Fonction d'aide
show_help() {
    echo -e "${BLUE}Script de conversion MKV/AVI vers MP4 - Optimisé vitesse${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS] [SOURCE] [DESTINATION]"
    echo ""
    echo "Arguments:"
    echo "  SOURCE      Chemin source. Défaut: ssh thim@ssh.thimotefetu.fr:/mnt/streaming"
    echo "  DEST        Dossier destination. Défaut: $DEFAULT_DEST"
    echo ""
    echo "Options de vitesse:"
    echo "  -p, --parallel [nombre]           Conversions simultanées (défaut: 3)"
    echo "  -q, --quality [turbo|fast|medium|best]  Vitesse de conversion (défaut: turbo)"
    echo "  -t, --threads [nombre]            Threads par conversion (défaut: auto)"
    echo ""
    echo "Options générales:"
    echo "  -d, --dry-run                     Mode simulation"
    echo "  -r, --resume                      Affiche les fichiers déjà convertis"
    echo "  -f, --force                       Force la reconversion"
    echo "  -m, --max-files [nombre]          Limite le nombre de fichiers"
    echo "  --preserve-structure              Préserve l'arborescence"
    echo "  --audio-bitrate [bitrate]         Bitrate audio en kbps (défaut: 256)"
    echo "  -h, --help                        Affiche cette aide"
    echo ""
    echo "Exemples ultra-rapides:"
    echo "  $0 -p 4 -q turbo                            # 4 conversions parallèles en mode turbo"
    echo "  $0 --parallel 6 --quality fast              # 6 conversions simultanées"
    echo "  $0 -p 2 --preserve-structure                # Parallèle avec structure"
    echo "  $0 --dry-run -p 4                           # Simulation parallèle"
    echo ""
}

# Variables par défaut
SOURCE_PATH="$DEFAULT_SOURCE"
DEST_PATH="$DEFAULT_DEST"
QUALITY="turbo"
THREADS="$(( $(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 8) / 2 ))"
PARALLEL_JOBS=3
AUDIO_BITRATE=256
DRY_RUN=false
RESUME_MODE=false
FORCE_RECONVERT=false
MAX_FILES=0
PRESERVE_STRUCTURE=false

# Traitement des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -p|--parallel)
            PARALLEL_JOBS="$2"
            shift 2
            ;;
        -q|--quality)
            QUALITY="$2"
            shift 2
            ;;
        -t|--threads)
            THREADS="$2"
            shift 2
            ;;
        --audio-bitrate)
            AUDIO_BITRATE="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -r|--resume)
            RESUME_MODE=true
            shift
            ;;
        -f|--force)
            FORCE_RECONVERT=true
            shift
            ;;
        -m|--max-files)
            MAX_FILES="$2"
            shift 2
            ;;
        --preserve-structure)
            PRESERVE_STRUCTURE=true
            shift
            ;;
        -*)
            echo -e "${RED}Option inconnue: $1${NC}"
            show_help
            exit 1
            ;;
        *)
            if [[ -z "$SOURCE_PATH" || "$SOURCE_PATH" == "$DEFAULT_SOURCE" ]]; then
                SOURCE_PATH="$1"
            else
                DEST_PATH="$1"
            fi
            shift
            ;;
    esac
done

# Expansion du tilde
DEST_PATH="${DEST_PATH/#\~/$HOME}"

# Configuration optimisée pour vitesse selon la qualité
case "$QUALITY" in
    turbo)
        CRF="25"
        PRESET="ultrafast"
        X264_PARAMS="ref=1:bframes=0:subme=1:me_range=4:rc_lookahead=1:trellis=0:8x8dct=0:aq-mode=0:deblock=0,0"
        ;;
    fast)
        CRF="23"
        PRESET="superfast"
        X264_PARAMS="ref=2:bframes=0:subme=2:me_range=8:rc_lookahead=10:trellis=0"
        ;;
    medium)
        CRF="22"
        PRESET="veryfast"
        X264_PARAMS="ref=3:bframes=1:subme=4:me_range=16:rc_lookahead=20"
        ;;
    best)
        CRF="20"
        PRESET="faster"
        X264_PARAMS="ref=4:bframes=2:subme=6:me_range=24:rc_lookahead=30"
        ;;
    *)
        CRF="25"
        PRESET="ultrafast"
        X264_PARAMS="ref=1:bframes=0:subme=1:me_range=4:rc_lookahead=1:trellis=0:8x8dct=0:aq-mode=0:deblock=0,0"
        ;;
esac

echo -e "${BLUE}=== Conversion Ultra-Rapide MKV/AVI → MP4 ===${NC}"
echo -e "Source: ${YELLOW}$SOURCE_PATH${NC}"
echo -e "Destination: ${YELLOW}$DEST_PATH${NC}"
echo -e "Qualité: ${YELLOW}$QUALITY${NC} (CRF: $CRF, Preset: $PRESET)"
echo -e "Parallélisme: ${YELLOW}$PARALLEL_JOBS conversions simultanées${NC}"
echo -e "Threads/conversion: ${YELLOW}$THREADS${NC}"
echo -e "Audio: ${YELLOW}${AUDIO_BITRATE}k AAC stéréo${NC}"
echo -e "Résolution: ${YELLOW}Originale préservée${NC}"

if [[ "$DRY_RUN" == true ]]; then
    echo -e "Mode: ${YELLOW}Simulation${NC}"
fi
if [[ "$RESUME_MODE" == true ]]; then
    echo -e "Mode: ${YELLOW}Reprise${NC}"
fi
if [[ "$FORCE_RECONVERT" == true ]]; then
    echo -e "Mode: ${YELLOW}Force${NC}"
fi
if [[ "$PRESERVE_STRUCTURE" == true ]]; then
    echo -e "Structure: ${YELLOW}Préservée${NC}"
fi
if [[ $MAX_FILES -gt 0 ]]; then
    echo -e "Limite: ${YELLOW}$MAX_FILES fichiers${NC}"
fi
echo ""

# Vérifications
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}❌ FFmpeg requis ! Installation: brew install ffmpeg${NC}"
    exit 1
fi

mkdir -p "$DEST_PATH"

# Fonction pour obtenir le chemin relatif
get_relative_path() {
    echo "${1#$2/}"
}

# Fonction pour obtenir le chemin MP4 de destination
get_expected_mp4_path() {
    local src_file="$1"
    local source_path="$2"
    
    if [[ "$PRESERVE_STRUCTURE" == true ]]; then
        if [[ "$source_path" == ssh* ]]; then
            local ssh_part="${source_path#ssh }"
            local remote_path="${ssh_part#*:}"
            local relative_path=$(get_relative_path "$src_file" "$remote_path")
            local relative_dir=$(dirname "$relative_path")
            local base_name=$(basename "$src_file")
            local name_no_ext="${base_name%.*}"
            
            if [[ "$relative_dir" != "." ]]; then
                echo "$DEST_PATH/$relative_dir/${name_no_ext}.mp4"
            else
                echo "$DEST_PATH/${name_no_ext}.mp4"
            fi
        else
            local relative_path=$(get_relative_path "$src_file" "$source_path")
            local relative_dir=$(dirname "$relative_path")
            local base_name=$(basename "$src_file")
            local name_no_ext="${base_name%.*}"
            
            if [[ "$relative_dir" != "." ]]; then
                echo "$DEST_PATH/$relative_dir/${name_no_ext}.mp4"
            else
                echo "$DEST_PATH/${name_no_ext}.mp4"
            fi
        fi
    else
        local base_name=$(basename "$src_file")
        local name_no_ext="${base_name%.*}"
        echo "$DEST_PATH/${name_no_ext}.mp4"
    fi
}

# Fonction pour vérifier si déjà converti
is_already_converted() {
    [[ "$FORCE_RECONVERT" == true ]] && return 1
    local expected_mp4=$(get_expected_mp4_path "$1" "$2")
    [[ -f "$expected_mp4" ]]
}

# Fonction pour scanner les fichiers
get_recursive_file_list() {
    local source_path="$1"
    local max_files="$2"
    
    if [[ "$source_path" == ssh* ]]; then
        local ssh_part="${source_path#ssh }"
        local user_host="${ssh_part%:*}"
        local remote_path="${ssh_part#*:}"
        
        echo -e "${BLUE}🔍 Scan SSH récursif: $user_host:$remote_path${NC}" >&2
        
        if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$user_host" "echo 'OK'" >/dev/null 2>&1; then
            echo -e "${RED}❌ Connexion SSH échouée${NC}" >&2
            return 1
        fi
        
        local all_files=$(ssh -i "$SSH_KEY" "$user_host" "find '$remote_path' -type f \( -iname '*.mkv' -o -iname '*.avi' \) 2>/dev/null | sort")
        
        local unconverted_files=""
        local converted_files=""
        local total_found=0
        local already_converted=0
        local files_to_process=0
        
        while IFS= read -r file; do
            [[ -z "$file" ]] && continue
            ((total_found++))
            
            if is_already_converted "$file" "$source_path"; then
                ((already_converted++))
                if [[ "$RESUME_MODE" == true ]]; then
                    echo -e "${GREEN}✅ $(basename "$file")${NC}" >&2
                    converted_files+="$file"$'\n'
                fi
            else
                if [[ $max_files -eq 0 || $files_to_process -lt $max_files ]]; then
                    unconverted_files+="$file"$'\n'
                    ((files_to_process++))
                    echo -e "${YELLOW}⏳ $(basename "$file")${NC}" >&2
                else
                    echo -e "${BLUE}📌 Limite atteinte ($max_files fichiers), arrêt du scan${NC}" >&2
                    break
                fi
            fi
        done <<< "$all_files"
        
        echo -e "${BLUE}📊 Total trouvés: $total_found | Déjà convertis: $already_converted | À traiter: $files_to_process${NC}" >&2
        
        if [[ "$RESUME_MODE" == true ]]; then
            echo -n "$converted_files"
        else
            echo -n "$unconverted_files"
        fi
    else
        echo -e "${BLUE}🔍 Scan local récursif: $source_path${NC}" >&2
        
        local all_files=$(find "$source_path" -type f \( -iname "*.mkv" -o -iname "*.avi" \) 2>/dev/null | sort)
        
        local unconverted_files=""
        local converted_files=""
        local total_found=0
        local already_converted=0
        local files_to_process=0
        
        while IFS= read -r file; do
            [[ -z "$file" ]] && continue
            ((total_found++))
            
            if is_already_converted "$file" "$source_path"; then
                ((already_converted++))
                if [[ "$RESUME_MODE" == true ]]; then
                    echo -e "${GREEN}✅ $(basename "$file")${NC}" >&2
                    converted_files+="$file"$'\n'
                fi
            else
                if [[ $max_files -eq 0 || $files_to_process -lt $max_files ]]; then
                    unconverted_files+="$file"$'\n'
                    ((files_to_process++))
                    echo -e "${YELLOW}⏳ $(basename "$file")${NC}" >&2
                else
                    echo -e "${BLUE}📌 Limite atteinte ($max_files fichiers), arrêt du scan${NC}" >&2
                    break
                fi
            fi
        done <<< "$all_files"
        
        echo -e "${BLUE}📊 Total trouvés: $total_found | Déjà convertis: $already_converted | À traiter: $files_to_process${NC}" >&2
        
        if [[ "$RESUME_MODE" == true ]]; then
            echo -n "$converted_files"
        else
            echo -n "$unconverted_files"
        fi
    fi
}

# Fonction de conversion ultra-optimisée
convert_file() {
    local src_file="$1"
    local source_path="$2"
    local job_id="$3"
    local filename=$(basename "$src_file")
    
    local dest_file=$(get_expected_mp4_path "$src_file" "$source_path")
    local dest_dir=$(dirname "$dest_file")
    mkdir -p "$dest_dir"
    
    if [[ -f "$dest_file" ]] && [[ "$FORCE_RECONVERT" != true ]]; then
        echo -e "${YELLOW}⏭️  [Job $job_id] Existe déjà: $filename${NC}"
        return 0
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        echo -e "${BLUE}📋 [Job $job_id] SIMULATION: $filename → $(basename "$dest_file")${NC}"
        return 0
    fi
    
    echo -e "${BLUE}🚀 [Job $job_id] Début conversion: $filename${NC}"
    
    # Commande FFmpeg ultra-optimisée pour vitesse
    if [[ "$source_path" == ssh* ]]; then
        local ssh_part="${source_path#ssh }"
        local user_host="${ssh_part%:*}"
        
        echo -e "${YELLOW}[Job $job_id] Lecture SSH: $filename${NC}" >&2
        
        # Test de lecture SSH
        if ! ssh -i "$SSH_KEY" "$user_host" "test -r \"$src_file\"" 2>/dev/null; then
            echo -e "${RED}❌ [Job $job_id] Fichier non accessible via SSH: $filename${NC}"
            return 1
        fi
        
        # Obtenir la taille du fichier source
        local source_size_bytes=$(ssh -i "$SSH_KEY" "$user_host" "stat -c%s \"$src_file\"" 2>/dev/null)
        local source_size_gb=""
        if [[ -n "$source_size_bytes" ]]; then
            source_size_gb=$(echo "scale=1; $source_size_bytes / 1024 / 1024 / 1024" | bc 2>/dev/null || echo "?")
            echo -e "${GREEN}[Job $job_id] Taille source: ${source_size_gb}GB${NC}" >&2
        fi
        
        # Conversion SSH sans timeout (macOS compatible)
        local conversion_start=$(date +%s)
        
        if ssh -i "$SSH_KEY" "$user_host" "cat \"$src_file\"" | \
           ffmpeg -hide_banner -loglevel error -stats \
                   -f matroska -i pipe:0 \
                   -c:v libx264 -preset "$PRESET" -crf "$CRF" \
                   -c:a aac -b:a "${AUDIO_BITRATE}k" -ac 2 \
                   -threads "$THREADS" \
                   -movflags +faststart \
                   -y "$dest_file"; then
            
            local conversion_end=$(date +%s)
            local conversion_duration=$((conversion_end - conversion_start))
            local dest_size=$(du -h "$dest_file" 2>/dev/null | cut -f1 || echo "?")
            local conv_min=$((conversion_duration / 60))
            local conv_sec=$((conversion_duration % 60))
            
            echo -e "${GREEN}✅ [Job $job_id] Terminé: $(basename "$dest_file") (${dest_size}) - ${conv_min}m${conv_sec}s${NC}"
            return 0
        else
            local exit_code=$?
            echo -e "${RED}❌ [Job $job_id] Erreur conversion (code: $exit_code): $filename${NC}"
            [[ -f "$dest_file" ]] && rm -f "$dest_file"
            return 1
        fi
        
    else
        # Conversion locale sans timeout (macOS compatible)
        local conversion_start=$(date +%s)
        
        if ffmpeg -hide_banner -loglevel error -stats \
               -i "$src_file" \
               -c:v libx264 -preset "$PRESET" -crf "$CRF" \
               -tune zerolatency -x264-params "$X264_PARAMS" \
               -c:a aac -b:a "${AUDIO_BITRATE}k" -ac 2 -ar 48000 \
               -threads "$THREADS" \
               -movflags +faststart \
               -fflags +genpts -avoid_negative_ts make_zero \
               -y "$dest_file" < /dev/null; then
            
            local conversion_end=$(date +%s)
            local conversion_duration=$((conversion_end - conversion_start))
            local dest_size=$(du -h "$dest_file" 2>/dev/null | cut -f1 || echo "?")
            local conv_min=$((conversion_duration / 60))
            local conv_sec=$((conversion_duration % 60))
            
            echo -e "${GREEN}✅ [Job $job_id] Terminé: $(basename "$dest_file") (${dest_size}) - ${conv_min}m${conv_sec}s${NC}"
            return 0
        else
            local exit_code=$?
            echo -e "${RED}❌ [Job $job_id] Erreur conversion (code: $exit_code): $filename${NC}"
            [[ -f "$dest_file" ]] && rm -f "$dest_file"
            return 1
        fi
    fi
}

# Recherche des fichiers
echo -e "${BLUE}🔍 Recherche des fichiers...${NC}"

file_list=$(get_recursive_file_list "$SOURCE_PATH" "$MAX_FILES")

# Nettoyer la liste des fichiers en supprimant les lignes vides
file_list=$(echo "$file_list" | grep -v '^[[:space:]]*$' | head -n "$MAX_FILES")

if [[ -z "$file_list" ]]; then
    echo -e "${YELLOW}⚠️  Aucun fichier trouvé ou tous déjà convertis${NC}"
    exit 0
fi

file_count=$(echo "$file_list" | wc -l)
echo -e "${GREEN}📁 $file_count fichier(s) trouvé(s) pour traitement${NC}"

if [[ "$RESUME_MODE" == true ]]; then
    echo -e "${YELLOW}📋 Fichiers déjà convertis:${NC}"
else
    echo -e "${YELLOW}📋 Fichiers à convertir:${NC}"
fi

# Affichage de la liste
echo "$file_list" | head -20 | while read -r file; do
    [[ -z "$file" ]] && continue
    echo "  - $(basename "$file")"
done

if [[ $file_count -gt 20 ]]; then
    echo -e "  ... et $((file_count - 20)) autres fichiers"
fi

echo ""
echo -e "${GREEN}📊 Total pour traitement: $file_count fichier(s)${NC}"

if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}🔍 Mode simulation${NC}"
fi

echo ""

# Confirmation
if [[ "$DRY_RUN" != true && "$RESUME_MODE" != true ]]; then
    read -p "Lancer la conversion ultra-rapide ? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Annulé${NC}"
        exit 0
    fi
fi

if [[ "$RESUME_MODE" == true ]]; then
    echo -e "${BLUE}📋 Mode reprise terminé${NC}"
    exit 0
fi

# Traitement parallèle ultra-optimisé
echo -e "${BLUE}🚀 Lancement de $PARALLEL_JOBS conversions parallèles...${NC}"
echo ""

total_converted=0
total_failed=0
start_time=$(date +%s)

# Fonction de traitement parallèle
process_parallel() {
    local temp_file=$(mktemp)
    echo "$file_list" > "$temp_file"
    
    local pids=()
    local job_counter=0
    local files_processed=0
    
    # Lecture ligne par ligne avec compteur
    while IFS= read -r file && [[ $files_processed -lt $file_count ]]; do
        [[ -z "$file" ]] && continue
        
        # Attendre qu'un slot se libère
        while [[ ${#pids[@]} -ge $PARALLEL_JOBS ]]; do
            local new_pids=()
            for pid in "${pids[@]}"; do
                if kill -0 "$pid" 2>/dev/null; then
                    new_pids+=("$pid")
                else
                    wait "$pid"
                    local exit_status=$?
                    if [[ $exit_status -eq 0 ]]; then 
                        ((total_converted++))
                        echo -e "${GREEN}📈 Progression: $total_converted/$file_count convertis${NC}" >&2
                    else 
                        ((total_failed++))
                        echo -e "${RED}📉 Échec: $total_failed (total: $((total_converted + total_failed))/$file_count)${NC}" >&2
                    fi
                fi
            done
            pids=("${new_pids[@]}")
            sleep 0.5
        done
        
        # Lancer une nouvelle conversion
        ((job_counter++))
        ((files_processed++))
        echo -e "${BLUE}🎬 Lancement job $job_counter: $(basename "$file") ($files_processed/$file_count)${NC}" >&2
        convert_file "$file" "$SOURCE_PATH" "$job_counter" &
        pids+=($!)
        
    done < "$temp_file"
    
    # Attendre la fin de tous les jobs restants
    echo -e "${BLUE}⏳ Attente de la fin des dernières conversions...${NC}" >&2
    for pid in "${pids[@]}"; do
        wait "$pid"
        local exit_status=$?
        if [[ $exit_status -eq 0 ]]; then 
            ((total_converted++))
            echo -e "${GREEN}📈 Progression finale: $total_converted/$file_count convertis${NC}" >&2
        else 
            ((total_failed++))
            echo -e "${RED}📉 Échec final: $total_failed (total: $((total_converted + total_failed))/$file_count)${NC}" >&2
        fi
    done
    
    rm -f "$temp_file"
}

# Lancer le traitement
process_parallel

# Résumé final
end_time=$(date +%s)
duration=$((end_time - start_time))
minutes=$((duration / 60))
seconds=$((duration % 60))

echo ""
echo -e "${BLUE}=== Résumé Ultra-Rapide ===${NC}"
if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}📋 Simulation: $file_count fichiers analysés${NC}"
else
    echo -e "${GREEN}✅ Convertis: $total_converted${NC}"
    echo -e "${RED}❌ Échecs: $total_failed${NC}"
    echo -e "${BLUE}📊 Total traité: $((total_converted + total_failed))/$file_count${NC}"
    if [[ $duration -gt 0 ]]; then
        echo -e "⚡ Vitesse: $((total_converted * 60 / duration)) fichiers/min${NC}"
    fi
    echo -e "⏱️  Durée: ${minutes}m ${seconds}s${NC}"
fi
echo -e "📁 Destination: $DEST_PATH"

if [[ "$PRESERVE_STRUCTURE" == true ]]; then
    echo -e "${BLUE}📊 Structure préservée${NC}"
fi

if [[ "$DRY_RUN" != true && $total_converted -gt 0 ]]; then
    echo -e "${GREEN}🎉 Conversion ultra-rapide terminée !${NC}"
fi