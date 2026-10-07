// 음성 안내 재생기
// 1) 페이지가 열리면 바로 재생을 시도한다.
// 2) 휴대폰이 자동 재생을 막으면(대부분의 아이폰·첫 방문 안드로이드) 화면 전체를 누르면 재생되게 바꾸고,
//    화면 읽기 프로그램(VoiceOver·TalkBack)이 "화면을 누르면 안내가 재생됩니다"를 읽도록 큰 버튼에 초점을 둔다.
(function () {
  var audio = document.getElementById('audio');
  var btn = document.getElementById('play');
  var label = btn.querySelector('.label');
  var sub = btn.querySelector('.sub');
  var icon = btn.querySelector('.icon');
  var timeEl = document.getElementById('time');
  var live = document.getElementById('live');
  var speedBtn = document.getElementById('speed');
  var speeds = [1, 1.25, 0.8];
  var speedNames = ['보통 빠르기', '조금 빠르게', '조금 느리게'];
  var speedIdx = 0;
  var blocked = false;

  function fmt(s) {
    if (!isFinite(s)) return '0:00';
    s = Math.max(0, Math.floor(s));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function say(msg) {
    live.textContent = '';
    setTimeout(function () { live.textContent = msg; }, 50);
  }
  function setState(state) {
    btn.dataset.state = state;
    if (state === 'playing') {
      icon.textContent = '❚❚';
      label.textContent = '안내 재생 중';
      sub.textContent = '누르면 잠시 멈춥니다';
      btn.setAttribute('aria-label', '안내 재생 중. 누르면 잠시 멈춥니다.');
    } else if (state === 'paused') {
      icon.textContent = '▶';
      label.textContent = '이어서 듣기';
      sub.textContent = '누르면 다시 재생됩니다';
      btn.setAttribute('aria-label', '멈춤. 누르면 이어서 재생됩니다.');
    } else if (state === 'ended') {
      icon.textContent = '↺';
      label.textContent = '다시 듣기';
      sub.textContent = '누르면 처음부터 다시 재생됩니다';
      btn.setAttribute('aria-label', '안내가 끝났습니다. 누르면 처음부터 다시 재생됩니다.');
    } else {
      icon.textContent = '▶';
      label.textContent = '화면을 누르면\n안내가 시작됩니다';
      sub.textContent = '화면 아무 곳이나 눌러 주세요';
      btn.setAttribute('aria-label', '음성 안내 듣기. 화면을 누르면 안내가 재생됩니다.');
    }
  }
  function play() {
    if (audio.ended) audio.currentTime = 0;
    var p = audio.play();
    if (p && p.catch) {
      p.catch(function () {
        blocked = true;
        setState('ready');
      });
    }
  }

  // 화면 아무 곳이나 눌러도 재생 (자동 재생이 막혔을 때만)
  document.addEventListener('click', function (e) {
    if (!blocked) return;
    if (e.target.closest('a, button, summary, details')) return;
    blocked = false;
    play();
  });
  btn.addEventListener('click', function () {
    blocked = false;
    if (audio.paused) play();
    else audio.pause();
  });
  document.getElementById('restart').addEventListener('click', function () {
    audio.currentTime = 0;
    play();
  });
  document.getElementById('back').addEventListener('click', function () {
    audio.currentTime = Math.max(0, audio.currentTime - 10);
    if (audio.paused) play();
  });
  speedBtn.addEventListener('click', function () {
    speedIdx = (speedIdx + 1) % speeds.length;
    audio.playbackRate = speeds[speedIdx];
    speedBtn.textContent = speedNames[speedIdx];
    say(speedNames[speedIdx] + '로 바꿨습니다');
  });

  audio.addEventListener('playing', function () { setState('playing'); });
  audio.addEventListener('pause', function () { if (!audio.ended) setState('paused'); });
  audio.addEventListener('ended', function () { setState('ended'); say('안내가 끝났습니다. 다시 들으려면 화면의 큰 버튼을 누르세요.'); });
  audio.addEventListener('timeupdate', function () { timeEl.textContent = fmt(audio.currentTime) + ' / ' + fmt(audio.duration); });
  audio.addEventListener('loadedmetadata', function () { timeEl.textContent = '0:00 / ' + fmt(audio.duration); });
  audio.addEventListener('error', function () {
    label.textContent = '음성을 불러오지 못했습니다';
    sub.textContent = '잠시 후 다시 누르거나, 아래 글로 보기를 이용해 주세요';
    say('음성을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  });

  // 잠금화면·알림 영역에 안내 제목 표시
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: document.querySelector('h1').textContent, artist: '2026 중랑 용마폭포축제' });
  }

  setState('ready');
  btn.focus({ preventScroll: true });
  play();
})();
