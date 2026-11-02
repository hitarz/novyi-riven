/**
 * Секретний талісман / координатор партії «Новий Рівень»
 * Тонка пасхалка в кутку сайту: акуратно виглядає, не кидається у вічі, але жива при кліку / наведенні.
 */
(function() {
  function initMascot() {
    if (document.getElementById('secretCornerMascot')) return;

    const phrases = [
      "Партія на висоті! ✨",
      "Головний по краватках 👔",
      "Ти помітив секретного координатора! 👀",
      "Новий Рівень рулить! 🚀",
      "Псс... краватки заряджені на перемогу! 🔥",
      "Шкільне життя має бути яскравим! 🌟",
      "Секретний протокол партії активовано 🤫"
    ];

    let phraseIndex = 0;
    let clickCount = 0;

    const mascot = document.createElement('div');
    mascot.id = 'secretCornerMascot';
    mascot.className = 'secret-corner-mascot';
    mascot.style.cssText = 'position: fixed; bottom: 0; right: 20px; z-index: 9980; width: 52px; height: 128px; cursor: pointer; user-select: none;';
    mascot.setAttribute('role', 'button');
    mascot.setAttribute('aria-label', 'Таємний спостерігач партії');
    mascot.title = 'Таємний координатор партії (клікніть!)';
    mascot.innerHTML = `
      <div class="mascot-speech-bubble" id="mascotBubble">${phrases[0]}</div>
      <div class="mascot-img-wrap" style="width: 52px; height: 128px; max-width: 52px; max-height: 128px; overflow: hidden; border-radius: 14px 14px 0 0; background: rgba(10,20,14,0.85); border: 1.5px solid rgba(0,255,102,0.35); border-bottom: none; box-shadow: 0 -4px 14px rgba(0,0,0,0.5);">
        <img src="assets/secret_agent.png" alt="Секретний спостерігач" class="mascot-img" width="52" height="128" style="width: 52px; height: 128px; max-width: 52px; max-height: 128px; object-fit: cover; object-position: top center; display: block;" loading="lazy">
      </div>
    `;

    document.body.appendChild(mascot);

    const bubble = document.getElementById('mascotBubble');

    mascot.addEventListener('click', (e) => {
      e.stopPropagation();
      clickCount++;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      if (bubble) {
        bubble.textContent = phrases[phraseIndex];
      }

      mascot.classList.add('active');
      mascot.classList.add('bounce');
      setTimeout(() => mascot.classList.remove('bounce'), 500);

      // Після 5 кліків поспіль — веселий пасхальний стрибок
      if (clickCount >= 5) {
        if (bubble) bubble.textContent = "⚡ 5 кліків! Рівень стилю: МАКСИМУМ ⚡";
        clickCount = 0;
      }

      // Приємний звуковий сигнал дзвіночка через Web Audio API
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.22);
      } catch (err) {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMascot);
  } else {
    initMascot();
  }
})();
