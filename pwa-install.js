(function () {
  'use strict';

  var promptEvent = null;
  var storageKey = 'cartellinosmart.install-suggestion-dismissed.v1';
  var dialog = document.getElementById('cartellinosmart-install-prompt');
  var installButton = document.getElementById('cartellinosmart-install-now');
  var laterButton = document.getElementById('cartellinosmart-install-later');

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true;
  }

  function wasDismissed() {
    try {
      return window.localStorage.getItem(storageKey) === '1';
    } catch (error) {
      return false;
    }
  }

  function rememberChoice() {
    try {
      window.localStorage.setItem(storageKey, '1');
    } catch (error) {
      // L'installazione rimane disponibile anche se lo storage è bloccato.
    }
  }

  function closeDialog() {
    rememberChoice();
    if (dialog && dialog.open) dialog.close();
  }

  if (dialog && installButton && laterButton) {
    window.addEventListener('beforeinstallprompt', function (event) {
      event.preventDefault();
      promptEvent = event;
      if (isStandalone() || wasDismissed()) return;

      // Lascia completare il primo rendering prima di mostrare la proposta.
      window.setTimeout(function () {
        if (promptEvent && !dialog.open && !isStandalone() && !wasDismissed()) {
          dialog.showModal();
        }
      }, 700);
    });

    installButton.addEventListener('click', async function () {
      if (!promptEvent) {
        closeDialog();
        return;
      }
      var chosenPrompt = promptEvent;
      promptEvent = null;
      try {
        await chosenPrompt.prompt();
        await chosenPrompt.userChoice;
      } catch (error) {
        // Un rifiuto o un errore non deve interrompere l'uso dell'app.
      }
      closeDialog();
    });

    laterButton.addEventListener('click', closeDialog);
    dialog.addEventListener('cancel', rememberChoice);
    window.addEventListener('appinstalled', function () {
      promptEvent = null;
      closeDialog();
    });
  }

  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./service-worker.js').catch(function () {
      // L'app continua a funzionare online se il browser blocca il service worker.
    });
  }
})();
