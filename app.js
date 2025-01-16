class PlaylistManager {
  constructor() {
    this.playlists = JSON.parse(localStorage.getItem('playlists')) || {};
    this.currentVideoId = null;
    this.player = null;
    
    this.initializeElements();
    this.bindEvents();
    this.checkPlaylists();
    this.loadYouTubeAPI();
  }

  loadYouTubeAPI() {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      
      window.onYouTubeIframeAPIReady = () => {
        this.initializeYouTubePlayer();
      };
    } else {
      this.initializeYouTubePlayer();
    }
  }

  initializeYouTubePlayer() {
    this.player = new YT.Player('player', {
      height: '400',
      width: '100%',
      videoId: '',
      playerVars: {
        'playsinline': 1,
        'controls': 1,
        'rel': 0
      },
      events: {
        'onStateChange': this.onPlayerStateChange.bind(this)
      }
    });
  }

  initializeElements() {
    this.youtubeUrlInput = document.getElementById('youtubeUrl');
    this.convertBtn = document.getElementById('convertBtn');
    this.noPlaylistMessage = document.getElementById('noPlaylistMessage');
    this.playlistContainer = document.getElementById('playlistContainer');
    this.playlistSelect = document.getElementById('playlistSelect');
    this.newPlaylistName = document.getElementById('newPlaylistName');
    this.initialPlaylistName = document.getElementById('initialPlaylistName');
    this.createPlaylistBtn = document.getElementById('createPlaylistBtn');
    this.initialCreatePlaylistBtn = document.getElementById('initialCreatePlaylistBtn');
    this.songList = document.getElementById('songList');
    this.visualizer = document.getElementById('visualizer');
  }

  bindEvents() {
    this.convertBtn.addEventListener('click', () => this.handleAddVideo());
    this.createPlaylistBtn.addEventListener('click', () => this.createPlaylist(this.newPlaylistName));
    this.initialCreatePlaylistBtn.addEventListener('click', () => this.createPlaylist(this.initialPlaylistName));
    this.playlistSelect.addEventListener('change', () => this.loadPlaylistSongs());
  }

  checkPlaylists() {
    if (Object.keys(this.playlists).length === 0) {
      this.noPlaylistMessage.classList.remove('hidden');
      this.playlistContainer.classList.add('hidden');
    } else {
      this.noPlaylistMessage.classList.add('hidden');
      this.playlistContainer.classList.remove('hidden');
      this.updatePlaylistSelect();
      this.loadPlaylistSongs();
    }
  }

  createPlaylist(inputElement) {
    const name = inputElement.value.trim();
    if (!name) {
      alert('Por favor, introduce un nombre para la lista de reproducción');
      return;
    }
    
    if (this.playlists[name]) {
      alert('Ya existe una lista de reproducción con ese nombre');
      return;
    }

    this.playlists[name] = [];
    this.saveToLocalStorage();
    inputElement.value = '';
    this.checkPlaylists();
  }

  updatePlaylistSelect() {
    this.playlistSelect.innerHTML = '';
    Object.keys(this.playlists).forEach(playlist => {
      const option = document.createElement('option');
      option.value = playlist;
      option.textContent = playlist;
      this.playlistSelect.appendChild(option);
    });
  }

  async handleAddVideo() {
    const url = this.youtubeUrlInput.value.trim();
    if (!url) {
      alert('Por favor, introduce un enlace de YouTube válido');
      return;
    }

    if (Object.keys(this.playlists).length === 0) {
      alert('Primero crea una lista de reproducción');
      return;
    }

    try {
      this.convertBtn.disabled = true;
      this.convertBtn.textContent = 'Añadiendo...';

      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('URL de YouTube no válida');
      }

      const videoData = await this.getYouTubeVideoData(videoId);
      
      const songInfo = {
        id: videoId,
        title: videoData.title,
        thumbnail: videoData.thumbnail
      };

      const selectedPlaylist = this.playlistSelect.value;
      this.playlists[selectedPlaylist].push(songInfo);
      this.saveToLocalStorage();
      this.loadPlaylistSongs();
      this.youtubeUrlInput.value = '';
      
      alert('¡Video añadido a la lista de reproducción!');
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      this.convertBtn.disabled = false;
      this.convertBtn.textContent = 'Añadir a la lista';
    }
  }

  extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }

  async getYouTubeVideoData(videoId) {
    try {
      const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
      const data = await response.json();
      return {
        title: data.title,
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      };
    } catch (error) {
      throw new Error('No se pudo obtener información del video');
    }
  }

  playSong(videoId) {
    if (this.player && this.player.loadVideoById) {
      this.player.loadVideoById(videoId);
      this.currentVideoId = videoId;
    }
  }

  onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
      const selectedPlaylist = this.playlistSelect.value;
      const currentIndex = this.playlists[selectedPlaylist].findIndex(song => song.id === this.currentVideoId);
      const nextIndex = (currentIndex + 1) % this.playlists[selectedPlaylist].length;
      this.playSong(this.playlists[selectedPlaylist][nextIndex].id);
    }
  }

  loadPlaylistSongs() {
    const selectedPlaylist = this.playlistSelect.value;
    this.songList.innerHTML = '';
    
    if (selectedPlaylist && this.playlists[selectedPlaylist]) {
      this.playlists[selectedPlaylist].forEach((song, index) => {
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        
        // Create playlist selector for moving songs
        const movePlaylistSelect = document.createElement('select');
        movePlaylistSelect.className = 'move-playlist-select';
        Object.keys(this.playlists).forEach(playlist => {
          if (playlist !== selectedPlaylist) {
            const option = document.createElement('option');
            option.value = playlist;
            option.textContent = playlist;
            movePlaylistSelect.appendChild(option);
          }
        });

        songItem.innerHTML = `
          <div class="song-info" onclick="playlistManager.playSong('${song.id}')">
            <img src="${song.thumbnail}" alt="${song.title}" class="song-thumbnail">
            <span class="song-title">${song.title}</span>
          </div>
          <div class="song-actions">
            ${Object.keys(this.playlists).length > 1 ? `
              <div class="move-controls">
                ${movePlaylistSelect.outerHTML}
                <button class="move-btn" onclick="playlistManager.moveSong('${selectedPlaylist}', ${index}, this.previousElementSibling.value)">
                  Mover
                </button>
              </div>
            ` : ''}
            <button class="delete-btn" onclick="playlistManager.removeSong('${selectedPlaylist}', ${index})">
              Eliminar
            </button>
          </div>
        `;
        this.songList.appendChild(songItem);
      });
    }
  }

  moveSong(fromPlaylist, songIndex, toPlaylist) {
    if (fromPlaylist === toPlaylist) return;
    
    const song = this.playlists[fromPlaylist][songIndex];
    this.playlists[fromPlaylist].splice(songIndex, 1);
    this.playlists[toPlaylist].push(song);
    
    this.saveToLocalStorage();
    this.loadPlaylistSongs();
  }

  removeSong(playlistName, index) {
    this.playlists[playlistName].splice(index, 1);
    this.saveToLocalStorage();
    this.loadPlaylistSongs();
  }

  saveToLocalStorage() {
    localStorage.setItem('playlists', JSON.stringify(this.playlists));
  }
}

const playlistManager = new PlaylistManager();