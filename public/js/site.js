document.addEventListener('DOMContentLoaded', () => {
  const menuButton = document.querySelector('.menu-button');
  const mainNav = document.querySelector('.main-nav');
  const navLinks = document.querySelectorAll('.main-nav a');
  const mobileContactButton = document.querySelector('.mobile-contact-button');
  const mobileContactPopover = document.querySelector('.mobile-contact-popover');

  const closeMenu = () => {
    mainNav?.classList.remove('is-open');
    menuButton?.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
  };

  const closeMobileContacts = () => {
    mobileContactPopover?.classList.remove('is-open');
    mobileContactButton?.classList.remove('is-open');
    mobileContactButton?.setAttribute('aria-expanded', 'false');
  };

  menuButton?.addEventListener('click', () => {
    const isOpen = mainNav?.classList.toggle('is-open') ?? false;

    closeMobileContacts();
    menuButton.classList.toggle('is-open', isOpen);
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });

  mobileContactButton?.addEventListener('click', () => {
    const isOpen = mobileContactPopover?.classList.toggle('is-open') ?? false;

    closeMenu();
    mobileContactButton.classList.toggle('is-open', isOpen);
    mobileContactButton.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  mobileContactPopover?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMobileContacts);
  });

  document.addEventListener('click', (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (!target.closest('.mobile-contact-popover') && !target.closest('.mobile-contact-button')) {
      closeMobileContacts();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
      closeMobileContacts();
    }
  });

  const filters = document.querySelector('[data-property-filters]');
  const quickSearch = document.querySelector('[data-hero-search]');
  const countNode = document.querySelector('[data-catalog-count]');
  const rowsContainer = document.querySelector('[data-property-table]');
  const cardsContainer = document.querySelector('[data-property-cards]');

  let activeFilterValues = null;
  let yandexMapsPromise = null;
  


  const normalizeText = (value) => String(value || '').trim().toLowerCase();

  const getMultiValues = (formData, name) =>
    formData.getAll(name).map((value) => String(value || '')).filter(Boolean);

  const getFilterValues = () => {
    if (!(filters instanceof HTMLFormElement)) {
      return {
        q: '',
        city: '',
        district: '',
        type: '',
        availability: [],
        temperature: [],
        leaseType: [],
        areaBucket: [],
        minArea: 0,
        maxArea: 0,
        sort: 'order',
      };
    }

    const formData = new FormData(filters);

    return {
      q: String(formData.get('q') || ''),
      city: String(formData.get('city') || ''),
      district: String(formData.get('district') || ''),
      type: String(formData.get('type') || ''),
      availability: getMultiValues(formData, 'availability'),
      temperature: getMultiValues(formData, 'temperature'),
      leaseType: getMultiValues(formData, 'leaseType'),
      areaBucket: getMultiValues(formData, 'areaBucket'),
      minArea: Number(formData.get('minArea') || 0),
      maxArea: Number(formData.get('maxArea') || 0),
      sort: String(formData.get('sort') || 'order'),
    };
  };

  const getSourceFromElement = (element) => ({
    title: element.getAttribute('data-title') || '',
    city: element.getAttribute('data-city') || '',
    district: element.getAttribute('data-district') || '',
    type: element.getAttribute('data-type') || '',
    availability: element.getAttribute('data-availability') || '',
    temperature: element.getAttribute('data-temperature') || '',
    leaseType: element.getAttribute('data-lease-type') || '',
    area: Number(element.getAttribute('data-area') || 0),
    order: Number(element.getAttribute('data-order') || 0),
    search: element.getAttribute('data-search') || '',
  });

  const areaMatchesBucket = (area, bucket) => {
    if (bucket === 'upto1000') return area <= 1000;
    if (bucket === '1000to5000') return area >= 1000 && area <= 5000;
    if (bucket === 'from5000') return area >= 5000;
    return true;
  };

  const valueInList = (selectedValues, sourceValue) => {
    if (!Array.isArray(selectedValues) || !selectedValues.length) return true;
    return selectedValues.includes(sourceValue);
  };

  const matchesSource = (source, values) => {
    if (!values) return true;

    const area = Number(source.area || 0);
    const haystack = normalizeText(
      source.search || `${source.title || ''} ${source.city || ''} ${source.district || ''} ${source.type || ''} ${source.temperature || ''} ${source.leaseType || ''} ${area}`
    );
    const query = normalizeText(values.q);

    if (query && !haystack.includes(query)) return false;
    if (values.city && source.city !== values.city) return false;
    if (values.district && source.district !== values.district) return false;
    if (values.type && source.type !== values.type) return false;
    if (!valueInList(values.availability, source.availability)) return false;
    if (!valueInList(values.temperature, source.temperature)) return false;
    if (!valueInList(values.leaseType, source.leaseType)) return false;
    if (values.areaBucket?.length && !values.areaBucket.some((bucket) => areaMatchesBucket(area, bucket))) return false;
    if (values.minArea && area < values.minArea) return false;
    if (values.maxArea && area > values.maxArea) return false;

    return true;
  };

  const matchesFilters = (element, values) => matchesSource(getSourceFromElement(element), values);

  const sortElements = (container, selector, sortMode) => {
    if (!container) return;

    const elements = Array.from(container.querySelectorAll(selector));

    const sorted = elements.sort((a, b) => {
      if (sortMode === 'area-asc' || sortMode === 'area-desc') {
        const first = Number(a.getAttribute('data-area') || 0);
        const second = Number(b.getAttribute('data-area') || 0);
        return sortMode === 'area-asc' ? first - second : second - first;
      }

      if (sortMode === 'title-asc') {
        return String(a.getAttribute('data-title') || '').localeCompare(
          String(b.getAttribute('data-title') || ''),
          'ru'
        );
      }

      return Number(a.getAttribute('data-order') || 0) - Number(b.getAttribute('data-order') || 0);
    });

    sorted.forEach((element) => container.appendChild(element));
  };

  /* ARENDASKLADA_MAP_CARD_SYNC_START */
  let highlightedMapCard = null;

  const clearMapCardHighlight = () => {
    if (highlightedMapCard) {
      highlightedMapCard.classList.remove('is-map-hovered');
      highlightedMapCard = null;
    }
  };

  const highlightPropertyCard = (order) => {
    clearMapCardHighlight();

    const card = Array.from(document.querySelectorAll('[data-property-card]')).find(
      (item) => String(item.getAttribute('data-order') || '') === String(order || '')
    );

    if (card) {
      card.classList.add('is-map-hovered');
      highlightedMapCard = card;
    }
  };

  const updateYandexMaps = (values) => {
    document.querySelectorAll('[data-yandex-map]').forEach((mapNode) => {
      const mapState = mapNode.__arendaYandexMap;

      if (mapState?.objectManager) {
        mapState.objectManager.setFilter((object) => matchesSource(object.properties || {}, values));
      }

      if (mapState?.leafletMap && Array.isArray(mapState.leafletMarkers)) {
        mapState.leafletMarkers.forEach(({ marker, source }) => {
          const shouldShow = matchesSource(source, values);
          const isVisible = mapState.leafletMap.hasLayer(marker);

          if (shouldShow && !isVisible) {
            marker.addTo(mapState.leafletMap);
          } else if (!shouldShow && isVisible) {
            mapState.leafletMap.removeLayer(marker);
          }
        });
      }
    });
  };
  /* ARENDASKLADA_MAP_CARD_SYNC_END */

  const applyPropertyFilters = () => {
    const values = getFilterValues();
    activeFilterValues = values;

    sortElements(rowsContainer, '[data-property-row]', values.sort);
    sortElements(cardsContainer, '[data-property-card]', values.sort);

    const rows = document.querySelectorAll('[data-property-row]');
    const cards = document.querySelectorAll('[data-property-card]');
    const markers = document.querySelectorAll('[data-property-marker]');

    let visibleCount = 0;

    rows.forEach((row) => {
      const isVisible = matchesFilters(row, values);
      row.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });

    if (!rows.length) {
      cards.forEach((card) => {
        if (matchesFilters(card, values)) visibleCount += 1;
      });
    }

    cards.forEach((card) => {
      card.hidden = !matchesFilters(card, values);
    });

    markers.forEach((marker) => {
      marker.hidden = !matchesFilters(marker, values);
    });

    updateYandexMaps(values);

    if (countNode) {
      countNode.textContent = `Найдено объектов: ${visibleCount}`;
    }
  };

  const setFormValue = (form, name, value) => {
    const field = form?.elements?.[name];

    if (field && 'value' in field) {
      field.value = value;
    }
  };

  if (filters) {
    filters.addEventListener('input', applyPropertyFilters);
    filters.addEventListener('change', applyPropertyFilters);

    const resetButton = filters.querySelector('[data-filter-reset]');
    resetButton?.addEventListener('click', () => {
      if (filters instanceof HTMLFormElement) {
        filters.reset();

        if (quickSearch instanceof HTMLFormElement) {
          setFormValue(quickSearch, 'q', '');
        }

        applyPropertyFilters();
      }
    });
  }

  if (quickSearch instanceof HTMLFormElement) {
    const syncQuickSearch = () => {
      if (filters instanceof HTMLFormElement) {
        const quickFormData = new FormData(quickSearch);
        setFormValue(filters, 'q', String(quickFormData.get('q') || ''));
        applyPropertyFilters();
      }
    };

    quickSearch.addEventListener('input', syncQuickSearch);

    quickSearch.addEventListener('submit', (event) => {
      event.preventDefault();
      syncQuickSearch();
      document.querySelector('#warehouses')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    quickSearch.querySelector('[data-hero-open-filters]')?.addEventListener('click', () => {
      document.querySelector('#warehouses')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

      window.setTimeout(() => {
        if (filters instanceof HTMLFormElement) {
          const firstInput = filters.querySelector('input, select');
          firstInput?.focus();
        }
      }, 450);
    });
  }

  const escapeHtml = (value) =>
    String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

  const loadYandexMaps = (apiKey) => {
    if (window.ymaps) {
      return Promise.resolve(window.ymaps);
    }

    if (yandexMapsPromise) {
      return yandexMapsPromise;
    }

    yandexMapsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const keyPart = apiKey ? `&apikey=${encodeURIComponent(apiKey)}` : '';

      script.src = `https://api-maps.yandex.ru/2.1/?lang=ru_RU${keyPart}`;
      script.async = true;
      script.onload = () => {
        if (window.ymaps) {
          window.ymaps.ready(() => resolve(window.ymaps));
        } else {
          reject(new Error('Yandex Maps API is unavailable'));
        }
      };
      script.onerror = () => reject(new Error('Yandex Maps API failed to load'));

      document.head.appendChild(script);
    });

    return yandexMapsPromise;
  };

  /* ARENDASKLADA_MAP_HOVER_RESTORE_START */
  let leafletMapsPromise = null;

  const loadLeafletMaps = () => {
    if (window.L) {
      return Promise.resolve(window.L);
    }

    if (leafletMapsPromise) {
      return leafletMapsPromise;
    }

    leafletMapsPromise = new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-arendasklada-leaflet]')) {
        const stylesheet = document.createElement('link');
        stylesheet.rel = 'stylesheet';
        stylesheet.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        stylesheet.setAttribute('data-arendasklada-leaflet', '');
        document.head.appendChild(stylesheet);
      }

      const existingScript = document.querySelector('script[data-arendasklada-leaflet]');

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window.L), { once: true });
        existingScript.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.setAttribute('data-arendasklada-leaflet', '');
      script.onload = () => window.L ? resolve(window.L) : reject(new Error('Leaflet is unavailable'));
      script.onerror = () => reject(new Error('Leaflet failed to load'));
      document.head.appendChild(script);
    });

    return leafletMapsPromise;
  };

  const getMapPoints = (mapNode) =>
    Array.from(mapNode.querySelectorAll('[data-yandex-point]'))
      .map((point, index) => {
        const lat = Number(point.getAttribute('data-lat'));
        const lng = Number(point.getAttribute('data-lng'));

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return null;
        }

        const source = getSourceFromElement(point);

        return {
          ...source,
          id: point.getAttribute('data-order') || String(index + 1),
          lat,
          lng,
        };
      })
      .filter(Boolean);

  const getMarkerColor = (availability) =>
    normalizeText(availability).includes('строящ') ? '#e5b84b' : '#4f8a68';

  const getMiniCardHtml = (point) => `
    <div class="map-mini-card">
      <strong>${escapeHtml(point.title)}</strong>
      <span>${escapeHtml(point.area)} м² · ${escapeHtml(point.leaseType)}</span>
      <b>${escapeHtml(point.availability)}</b>
    </div>
  `;

  const initLeafletFallback = async (mapNode, points) => {
    const L = await loadLeafletMaps();
    const centerLat = Number(mapNode.getAttribute('data-center-lat') || points[0].lat);
    const centerLng = Number(mapNode.getAttribute('data-center-lng') || points[0].lng);
    const zoom = Number(mapNode.getAttribute('data-zoom') || 11);

    mapNode.innerHTML = '';

    const map = L.map(mapNode, {
      center: [centerLat, centerLng],
      zoom,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const leafletMarkers = points.map((point, index) => {
      const isBuilding = normalizeText(point.availability).includes('строящ');
      const marker = L.marker([point.lat, point.lng], {
        icon: L.divIcon({
          className: 'leaflet-object-icon',
          html: `<span class="leaflet-status-dot ${isBuilding ? 'is-building' : 'is-ready'}">${index + 1}</span>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
        keyboard: true,
        riseOnHover: true,
      });

      marker.bindTooltip(getMiniCardHtml(point), {
        direction: 'top',
        offset: [0, -14],
        opacity: 1,
        className: 'leaflet-mini-tooltip',
      });

      marker.on('mouseover focus', () => {
        highlightPropertyCard(point.order || point.id);
        marker.openTooltip();
      });

      marker.on('mouseout blur', () => {
        clearMapCardHighlight();
        marker.closeTooltip();
      });

      marker.on('click', (event) => {
        event.originalEvent?.preventDefault?.();
        marker.openTooltip();
      });

      marker.addTo(map);
      return { marker, source: point };
    });

    if (leafletMarkers.length > 1) {
      map.fitBounds(
        leafletMarkers.map(({ marker }) => marker.getLatLng()),
        { padding: [46, 46], maxZoom: 13 }
      );
    }

    mapNode.__arendaYandexMap = { leafletMap: map, leafletMarkers };
    mapNode.classList.add('is-leaflet-ready');
    updateYandexMaps(activeFilterValues || getFilterValues());

    window.setTimeout(() => map.invalidateSize(), 100);
  };

  const initYandexMap = async (mapNode) => {
    const points = getMapPoints(mapNode);

    if (!points.length) {
      return;
    }

    try {
      const ymaps = await loadYandexMaps(mapNode.getAttribute('data-yandex-api-key') || '');
      const centerLat = Number(mapNode.getAttribute('data-center-lat') || points[0].lat);
      const centerLng = Number(mapNode.getAttribute('data-center-lng') || points[0].lng);
      const zoom = Number(mapNode.getAttribute('data-zoom') || 11);

      const map = new ymaps.Map(
        mapNode,
        {
          center: [centerLat, centerLng],
          zoom,
          controls: ['zoomControl', 'fullscreenControl'],
        },
        {
          suppressMapOpenBlock: true,
          yandexMapDisablePoiInteractivity: true,
        }
      );

      map.behaviors.disable('scrollZoom');

      const objectManager = new ymaps.ObjectManager({
        clusterize: true,
        gridSize: 64,
      });

      objectManager.objects.options.set({
        preset: 'islands#circleDotIcon',
        hasBalloon: false,
        openBalloonOnClick: false,
        openHintOnHover: true,
      });

      objectManager.clusters.options.set('preset', 'islands#greenClusterIcons');

      objectManager.add({
        type: 'FeatureCollection',
        features: points.map((point) => ({
          type: 'Feature',
          id: point.id,
          geometry: {
            type: 'Point',
            coordinates: [point.lat, point.lng],
          },
          options: {
            preset: 'islands#circleDotIcon',
            iconColor: getMarkerColor(point.availability),
            hasBalloon: false,
            openBalloonOnClick: false,
          },
          properties: {
            title: point.title,
            city: point.city,
            district: point.district,
            type: point.type,
            availability: point.availability,
            temperature: point.temperature,
            leaseType: point.leaseType,
            area: point.area,
            order: point.order,
            search: point.search,
            hintContent: getMiniCardHtml(point),
          },
        })),
      });

      map.geoObjects.add(objectManager);

      objectManager.objects.events.add('mouseenter', (event) => {
        const objectId = event.get('objectId');
        const object = objectManager.objects.getById(objectId);
        highlightPropertyCard(object?.properties?.order ?? objectId);
      });

      objectManager.objects.events.add('mouseleave', clearMapCardHighlight);
      objectManager.objects.events.add('click', (event) => {
        event.preventDefault?.();
      });

      mapNode.__arendaYandexMap = { map, objectManager };
      mapNode.classList.add('is-yandex-ready');
      updateYandexMaps(activeFilterValues || getFilterValues());

      if (points.length > 1) {
        const bounds = objectManager.getBounds();

        if (bounds) {
          map.setBounds(bounds, {
            checkZoomRange: true,
            zoomMargin: [70, 70, 110, 70],
          });
        }
      }
    } catch (error) {
      console.warn('Yandex Maps unavailable, switching to OpenStreetMap:', error);

      try {
        await initLeafletFallback(mapNode, points);
      } catch (leafletError) {
        mapNode.classList.add('is-yandex-fallback');
        console.warn('OpenStreetMap fallback unavailable:', leafletError);
      }
    }
  };

  document.querySelectorAll('[data-property-marker]').forEach((marker) => {
    const activate = () => highlightPropertyCard(marker.getAttribute('data-order'));

    marker.addEventListener('click', (event) => event.preventDefault());
    marker.addEventListener('pointerenter', activate);
    marker.addEventListener('pointerleave', clearMapCardHighlight);
    marker.addEventListener('focusin', activate);
    marker.addEventListener('focusout', clearMapCardHighlight);
  });
  /* ARENDASKLADA_MAP_HOVER_RESTORE_END */

  document.querySelectorAll('[data-yandex-map]').forEach((mapNode) => {
    initYandexMap(mapNode);
  });

  applyPropertyFilters();

  const leadForm = document.querySelector('#lead-form');
  const formNote = document.querySelector('.form-note');

  leadForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (formNote) {
      formNote.textContent = 'Отправляем заявку...';
    }

    const formData = new FormData(leadForm);

    try {
      const response = await fetch(leadForm.action, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        leadForm.reset();

        if (formNote) {
          formNote.textContent = 'Спасибо! Заявка отправлена.';
        }
      } else if (formNote) {
        formNote.textContent = 'Форма готова, но endpoint ещё нужно подключить по маячку ARENDASKLADA_MARKER_FORM_ENDPOINT.';
      }
    } catch {
      if (formNote) {
        formNote.textContent = 'Endpoint формы ещё не подключён. Замените /api/leads на ваш Worker или CRM webhook.';
      }
    }
  });

  const createLightbox = () => {
    let lightbox = document.querySelector('.image-lightbox');

    if (lightbox) {
      return lightbox;
    }

    lightbox = document.createElement('dialog');
    lightbox.className = 'image-lightbox';
    lightbox.setAttribute('aria-label', 'Просмотр изображения');

    lightbox.innerHTML = `
      <button class="image-lightbox-close" type="button" aria-label="Закрыть">
        ×
      </button>
      <img class="image-lightbox-img" src="" alt="" />
    `;

    document.body.appendChild(lightbox);

    const closeButton = lightbox.querySelector('.image-lightbox-close');

    closeButton?.addEventListener('click', () => {
      lightbox.close();
    });

    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) {
        lightbox.close();
      }
    });

    lightbox.addEventListener('close', () => {
      document.body.classList.remove('lightbox-open');
    });

    return lightbox;
  };

  document.addEventListener('click', (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest('.image-open-button');

    if (!button) {
      return;
    }

    const imageSrc = button.getAttribute('data-lightbox-src');
    const imageAlt = button.getAttribute('data-lightbox-alt') || '';

    if (!imageSrc) {
      return;
    }

    const lightbox = createLightbox();
    const lightboxImg = lightbox.querySelector('.image-lightbox-img');

    if (!lightboxImg) {
      return;
    }

    lightboxImg.src = imageSrc;
    lightboxImg.alt = imageAlt;

    lightbox.showModal();
    document.body.classList.add('lightbox-open');
  });

  /* ARENDASKLADA_AUTO_CLOSE_POPOVERS_START */
  document.querySelectorAll('.catalog-toolbar details.toolbar-filter').forEach((detail) => {
    let closeTimer = 0;

    const cancelClose = () => {
      if (closeTimer) {
        window.clearTimeout(closeTimer);
        closeTimer = 0;
      }
    };

    const closeSoon = () => {
      cancelClose();
      closeTimer = window.setTimeout(() => {
        detail.open = false;
        closeTimer = 0;
      }, 140);
    };

    detail.addEventListener('pointerenter', cancelClose);
    detail.addEventListener('pointerleave', closeSoon);
    detail.addEventListener('focusin', cancelClose);
    detail.addEventListener('focusout', (event) => {
      const next = event.relatedTarget;
      if (!(next instanceof Node) || !detail.contains(next)) {
        closeSoon();
      }
    });

    detail.addEventListener('toggle', () => {
      if (!detail.open) return;

      document.querySelectorAll('.catalog-toolbar details.toolbar-filter').forEach((other) => {
        if (other !== detail) {
          other.open = false;
        }
      });
    });
  });
  /* ARENDASKLADA_AUTO_CLOSE_POPOVERS_END */

});
