(function () {
  'use strict';

  var promptEvent = null;
  var storageKey = 'cartellinosmart.install-suggestion-dismissed.v1';
  var suggestionScheduled = false;
  var instructionsShown = false;
  var dialog = document.getElementById('cartellinosmart-install-prompt');
  var description = document.getElementById('cartellinosmart-install-description');
  var installButton = document.getElementById('cartellinosmart-install-now');
  var laterButton = document.getElementById('cartellinosmart-install-later');
  var defaultDescription = 'Aggiungila al dispositivo per aprirla in una finestra dedicata. Dopo la prima visita online, potrai riutilizzarla anche senza connessione.';

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true;
  }

  function isChromiumBrowser() {
    var brands = window.navigator.userAgentData && window.navigator.userAgentData.brands;
    if (brands && brands.some(function (brand) {
      return /Google Chrome|Microsoft Edge|Chromium|Opera/i.test(brand.brand);
    })) return true;

    var ua = window.navigator.userAgent || '';
    return /(?:Chrome|Chromium|Edg|OPR|Brave)\//.test(ua) && !/(?:CriOS|EdgiOS)\//.test(ua);
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
      // L'installazione resta disponibile anche se lo storage è bloccato.
    }
  }

  function closeDialog() {
    rememberChoice();
    if (dialog && dialog.open) dialog.close();
  }

  function updateInstallAction() {
    if (!dialog || !description || !installButton || instructionsShown) return;
    description.textContent = defaultDescription;
    installButton.textContent = promptEvent ? 'Installa' : 'Come installare';
  }

  window.cartellinoOpenInstallDialog = function () {
    if (!dialog || dialog.open) return;
    updateInstallAction();
    dialog.showModal();
  };
  function showSuggestion() {
    if (suggestionScheduled || !dialog || !installButton || !laterButton ||
        !window.isSecureContext || !isChromiumBrowser() || isStandalone() || wasDismissed()) return;

    suggestionScheduled = true;
    window.setTimeout(function () {
      suggestionScheduled = false;
      if (!dialog.open && !isStandalone() && !wasDismissed()) {
        updateInstallAction();
        dialog.showModal();
      }
    }, 700);
  }

  if (dialog && description && installButton && laterButton) {
    window.addEventListener('beforeinstallprompt', function (event) {
      event.preventDefault();
      promptEvent = event;
      instructionsShown = false;
      if (dialog.open) updateInstallAction();
      else showSuggestion();
    });

    installButton.addEventListener('click', async function () {
      if (promptEvent) {
        var chosenPrompt = promptEvent;
        promptEvent = null;
        try {
          await chosenPrompt.prompt();
          await chosenPrompt.userChoice;
        } catch (error) {
          // Un rifiuto o un errore non deve interrompere l'uso dell'app.
        }
        closeDialog();
        return;
      }

      if (!instructionsShown) {
        instructionsShown = true;
        description.textContent = 'Nel menu di Edge o Chrome cerca “Installa CartellinoSmart” o “Installa questa pagina come app”. In Edge la voce è di solito sotto App; in Chrome può trovarsi in “Salva e condividi”. I nomi possono variare leggermente in base alla versione del browser.';
        installButton.textContent = 'Ho capito';
        return;
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
    navigator.serviceWorker.register('./service-worker.js')
      .then(function () {
        if (isChromiumBrowser() && !isStandalone() && !wasDismissed()) {
          navigator.serviceWorker.ready.then(showSuggestion);
        }
      })
      .catch(function () {
        // L'app continua a funzionare online se il browser blocca il service worker.
      });
  }
})();
