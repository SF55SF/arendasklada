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
        rentActive: false,
        minRent: 0,
        maxRent: 0,
        sort: 'order',
      };
    }

    const formData = new FormData(filters);
    const rentMinInput = filters.querySelector('[data-rent-min]');
    const rentMaxInput = filters.querySelector('[data-rent-max]');
    const rentMinValue = Number(rentMinInput?.value || 0);
    const rentMaxValue = Number(rentMaxInput?.value || 0);
    const rentDefaultMin = Number(rentMinInput?.getAttribute('data-default-value') || 0);
    const rentDefaultMax = Number(rentMaxInput?.getAttribute('data-default-value') || 0);
    const rentActive =
      Math.abs(rentMinValue - rentDefaultMin) > 0.001 ||
      Math.abs(rentMaxValue - rentDefaultMax) > 0.001;

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
      rentActive,
      minRent: rentMinValue,
      maxRent: rentMaxValue,
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
    price: element.getAttribute('data-price') || '',
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

    if (values.rentActive) {
      const rentMatch = String(source.price || '').replace(',', '.').match(/[0-9]+(?:[.][0-9]+)?/);
      const rent = rentMatch ? Number(rentMatch[0]) : Number.NaN;
      if (!Number.isFinite(rent)) return false;
      if (rent < values.minRent || rent > values.maxRent) return false;
    }

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

        /* ARENDASKLADA_RENT_FILTER_RUNTIME_START */
  const rentFilter = filters?.querySelector('[data-rent-filter]');
  const rentMinInput = filters?.querySelector('[data-rent-min]');
  const rentMaxInput = filters?.querySelector('[data-rent-max]');
  const rentMinOutput = filters?.querySelector('[data-rent-min-output]');
  const rentMaxOutput = filters?.querySelector('[data-rent-max-output]');

  const formatRentValue = (value) =>
    Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 });

  const syncRentRange = (changedInput = null) => {
    if (!(rentMinInput instanceof HTMLInputElement) || !(rentMaxInput instanceof HTMLInputElement)) return;

    let minValue = Number(rentMinInput.value || 0);
    let maxValue = Number(rentMaxInput.value || 0);

    if (minValue > maxValue) {
      if (changedInput === rentMinInput) {
        maxValue = minValue;
        rentMaxInput.value = String(maxValue);
      } else {
        minValue = maxValue;
        rentMinInput.value = String(minValue);
      }
    }

    if (rentMinOutput) rentMinOutput.textContent = formatRentValue(minValue);
    if (rentMaxOutput) rentMaxOutput.textContent = formatRentValue(maxValue);

    if (rentFilter instanceof HTMLElement) {
      const absoluteMin = Number(rentMinInput.min || 0);
      const absoluteMax = Number(rentMinInput.max || 100);
      const span = Math.max(absoluteMax - absoluteMin, 1);
      rentFilter.style.setProperty('--rent-low', ((minValue - absoluteMin) / span * 100) + '%');
      rentFilter.style.setProperty('--rent-high', ((maxValue - absoluteMin) / span * 100) + '%');
    }
  };

  [rentMinInput, rentMaxInput].forEach((input) => {
    input?.addEventListener('input', () => {
      syncRentRange(input);
      applyPropertyFilters();
    });
    input?.addEventListener('change', () => {
      syncRentRange(input);
      applyPropertyFilters();
    });
  });

  filters?.addEventListener('reset', () => {
    window.setTimeout(() => {
      syncRentRange();
      applyPropertyFilters();
    }, 0);
  });

  syncRentRange();
  /* ARENDASKLADA_RENT_FILTER_RUNTIME_END */

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
    normalizeText(availability).includes('стро') ? '#f2c94c' : '#2f9e5b';

  const getMarkerPreset = (availability) =>
    normalizeText(availability).includes('стро')
      ? 'islands#yellowCircleDotIcon'
      : 'islands#greenCircleDotIcon';

  const formatMapTitle = (value) =>
    String(value || '').replace(/^Логистический центр\s*[—-]\s*/i, '').trim();

  const formatMapArea = (value) => {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number.toLocaleString('ru-RU') : String(value || '');
  };

  const formatMapRent = (value) => {
    const raw = String(value || '').trim();
    const priceNumber = raw.match(/\d+(?:[.,]\d+)?/)?.[0];

    if (normalizeText(raw) === 'по запросу' || !priceNumber) {
      return 'По запросу';
    }

    return `от $ ${priceNumber} за м²`;
  };

  const formatMapReady = (value) =>
    normalizeText(value).includes('стро') ? 'Строящийся' : 'Действующий';

  const getMiniCardHtml = (point) => `
    <div class="map-mini-card">
      <strong class="map-mini-card__title">${escapeHtml(formatMapTitle(point.title))}</strong>
      <div class="map-mini-card__specs">
        <div class="map-mini-card__row"><b>Площадь:</b><span>${escapeHtml(formatMapArea(point.area))} м²</span></div>
        <div class="map-mini-card__row"><b>Ставка аренды:</b><span>${escapeHtml(formatMapRent(point.price))}</span></div>
        <div class="map-mini-card__row"><b>Готовность:</b><span>${escapeHtml(formatMapReady(point.availability))}</span></div>
      </div>
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
      scrollWheelZoom: true,
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
          html: `<span class="leaflet-status-dot ${isBuilding ? 'is-building' : 'is-ready'}" data-order="${escapeHtml(point.order || point.id)}">${index + 1}</span>`,
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

      map.behaviors.enable('scrollZoom');
      if(typeof map.setType==='function')map.setType('yandex#map');

      const objectManager = new ymaps.ObjectManager({
        clusterize: true,
        gridSize: 64,
      });

      /* ARENDASKLADA_YANDEX_STATUS_LAYOUT_START */
      const yandexStatusLayout = ymaps.templateLayoutFactory.createClass(
        '<div class="yandex-status-dot $[properties.statusClass]" data-order="$[properties.order]">$[properties.markerNumber]</div>'
      );
      /* ARENDASKLADA_YANDEX_STATUS_LAYOUT_END */

      objectManager.objects.options.set({
        iconLayout: yandexStatusLayout,
        iconShape: { type: 'Circle', coordinates: [0, 0], radius: 18 },
        hasBalloon: false,
        openBalloonOnClick: false,
        openHintOnHover: false,
      });

      objectManager.clusters.options.set('preset', 'islands#greenClusterIcons');

      objectManager.add({
        type: 'FeatureCollection',
        features: points.map((point, index) => ({
          type: 'Feature',
          id: point.id,
          geometry: {
            type: 'Point',
            coordinates: [point.lat, point.lng],
          },
          options: {
            preset: getMarkerPreset(point.availability),
            iconColor: getMarkerColor(point.availability),
            hasBalloon: false,
            openBalloonOnClick: false,
          },
          properties: {
            markerNumber: index + 1,
            statusClass: normalizeText(point.availability).includes('стро') ? 'is-building' : 'is-ready',
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

  
  



  


  /* ARENDASKLADA_MAP_FLYOUT_REPAIR_START */
const mapFlyoutState = { source: null, node: null, timer: 0 };
  const FLYOUT_DURATION = 286;

  const setImportant = (node, property, value) => {
    node.style.setProperty(property, value, 'important');
  };

  const copyComputedAppearance = (source, clone) => {
    const sourceNodes = [source, ...source.querySelectorAll('*')];
    const cloneNodes = [clone, ...clone.querySelectorAll('*')];

    sourceNodes.forEach((sourceNode, index) => {
      const cloneNode = cloneNodes[index];
      if (!(sourceNode instanceof Element) || !(cloneNode instanceof Element)) return;
      const computed = window.getComputedStyle(sourceNode);
      for (let i = 0; i < computed.length; i += 1) {
        const property = computed.item(i);
        try {
          cloneNode.style.setProperty(property, computed.getPropertyValue(property), computed.getPropertyPriority(property));
        } catch {}
      }
    });
  };

  const getCatalogMapNode = () =>
    document.querySelector('.catalog-static-map') || document.querySelector('[data-yandex-map]');

  const removeMapFlyout = (animate = true) => {
    window.clearTimeout(mapFlyoutState.timer);
    const flyout = mapFlyoutState.node;
    mapFlyoutState.node = null;
    mapFlyoutState.source = null;
    if (!(flyout instanceof HTMLElement)) return;

    const finish = () => flyout.remove();
    if (!animate) {
      finish();
      return;
    }

    flyout.classList.remove('is-visible');
    setImportant(flyout, 'transform', 'translate3d(0, 0, 0) scale(1)');
    setImportant(flyout, 'opacity', '0');
    mapFlyoutState.timer = window.setTimeout(finish, FLYOUT_DURATION + 40);
  };

  const showMapFlyout = (source) => {
    if (!(source instanceof HTMLElement) || window.innerWidth <= 900) return;
    if (mapFlyoutState.source === source && mapFlyoutState.node?.isConnected) return;

    removeMapFlyout(false);
    const mapNode = getCatalogMapNode();
    if (!(mapNode instanceof HTMLElement)) return;

    const sourceRect = source.getBoundingClientRect();
    const mapRect = mapNode.getBoundingClientRect();
    if (sourceRect.width < 40 || sourceRect.height < 40) return;

    const scale = 1.3;
    const gap = 18;
    const viewportGap = 18;
    const scaledWidth = sourceRect.width * scale;
    const scaledHeight = sourceRect.height * scale;
    const targetLeft = Math.min(
      Math.max(viewportGap, mapRect.right + gap),
      window.innerWidth - scaledWidth - viewportGap
    );
    const targetTop = Math.min(
      Math.max(viewportGap, mapRect.top + (mapRect.height - scaledHeight) / 2),
      window.innerHeight - scaledHeight - viewportGap
    );
    const sourceCenterX = sourceRect.left + sourceRect.width / 2;
    const sourceCenterY = sourceRect.top + sourceRect.height / 2;
    const targetCenterX = targetLeft + scaledWidth / 2;
    const targetCenterY = targetTop + scaledHeight / 2;
    const deltaX = targetCenterX - sourceCenterX;
    const deltaY = targetCenterY - sourceCenterY;

    const flyout = source.cloneNode(true);
    copyComputedAppearance(source, flyout);
    flyout.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    flyout.removeAttribute('data-property-card');
    flyout.removeAttribute('data-order');
    flyout.removeAttribute('hidden');
    flyout.classList.remove('is-map-hovered');
    flyout.classList.add('map-edge-card-flyout');
    flyout.setAttribute('aria-hidden', 'true');
    flyout.setAttribute('inert', '');

    setImportant(flyout, 'position', 'fixed');
    setImportant(flyout, 'left', `${sourceRect.left}px`);
    setImportant(flyout, 'top', `${sourceRect.top}px`);
    setImportant(flyout, 'width', `${sourceRect.width}px`);
    setImportant(flyout, 'height', `${sourceRect.height}px`);
    setImportant(flyout, 'min-width', '0');
    setImportant(flyout, 'max-width', 'none');
    setImportant(flyout, 'min-height', '0');
    setImportant(flyout, 'max-height', 'none');
    setImportant(flyout, 'margin', '0');
    setImportant(flyout, 'z-index', '10050');
    setImportant(flyout, 'pointer-events', 'none');
    setImportant(flyout, 'transform-origin', 'center center');
    setImportant(flyout, 'transform', 'translate3d(0, 0, 0) scale(1)');
    setImportant(flyout, 'opacity', '0');
    setImportant(
      flyout,
      'transition',
      `transform ${FLYOUT_DURATION}ms ease, opacity 208ms ease, box-shadow ${FLYOUT_DURATION}ms ease`
    );
    setImportant(flyout, 'box-shadow', '0 24px 64px rgba(19, 25, 54, .34)');
    setImportant(flyout, 'overflow', 'hidden');

    document.body.appendChild(flyout);
    mapFlyoutState.source = source;
    mapFlyoutState.node = flyout;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (mapFlyoutState.node !== flyout) return;
        flyout.classList.add('is-visible');
        setImportant(flyout, 'transform', `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scale})`);
        setImportant(flyout, 'opacity', '1');
      });
    });
  };

  const syncMapFlyout = () => {
    const active = document.querySelector('[data-property-card].is-map-hovered');
    if (active instanceof HTMLElement) showMapFlyout(active);
    else removeMapFlyout(true);
  };

  const flyoutObserver = new MutationObserver(syncMapFlyout);
  document.querySelectorAll('[data-property-card]').forEach((card) => {
    flyoutObserver.observe(card, { attributes: true, attributeFilter: ['class'] });
  });

  window.addEventListener('resize', () => {
    const source = mapFlyoutState.source;
    if (source instanceof HTMLElement) {
      removeMapFlyout(false);
      showMapFlyout(source);
    }
  });
  /* ARENDASKLADA_MAP_FLYOUT_REPAIR_END */



  /* ARENDASKLADA_RENT_INLINE_COMPACT_START */
  const setupCompactRentFilter = () => {
    const form = document.querySelector('[data-property-filters]');
    if (!(form instanceof HTMLFormElement)) return;

    const rentRoot = Array.from(
      form.querySelectorAll('details, [data-rent-filter], .toolbar-filter')
    ).find((node) => /ставка\s+аренды/i.test(String(node.textContent || '')));

    if (!(rentRoot instanceof HTMLElement)) return;
    if (rentRoot.dataset.compactRentReady === 'true') return;

    rentRoot.dataset.compactRentReady = 'true';
    rentRoot.classList.add('catalog-rent-compact');

    if (rentRoot instanceof HTMLDetailsElement) {
      rentRoot.open = true;
    }

    const summary = rentRoot.querySelector('summary');
    if (summary instanceof HTMLElement) {
      summary.textContent = 'Ставка аренды';
      summary.setAttribute('aria-disabled', 'true');
      summary.addEventListener('click', (event) => event.preventDefault());
    }

    const ranges = Array.from(rentRoot.querySelectorAll('input[type="range"]'));
    if (!ranges.length) return;

    const lowInput = ranges[0];
    const highInput = ranges[1] || ranges[0];
    const floor = Math.min(
      Number(lowInput.min || lowInput.value || 0),
      Number(highInput.min || highInput.value || 0)
    );
    const ceiling = Math.max(
      Number(lowInput.max || lowInput.value || floor),
      Number(highInput.max || highInput.value || floor)
    );

    const body = document.createElement('div');
    body.className = 'catalog-rent-compact__body';

    const lowValue = document.createElement('span');
    lowValue.className = 'catalog-rent-compact__value catalog-rent-compact__value--low';

    const highValue = document.createElement('span');
    highValue.className = 'catalog-rent-compact__value catalog-rent-compact__value--high';

    const slider = document.createElement('div');
    slider.className = 'catalog-rent-compact__slider';

    ranges.forEach((input) => {
      input.classList.add('catalog-rent-compact__range');
      slider.appendChild(input);
    });

    body.append(lowValue, slider, highValue);

    const fieldset = rentRoot.querySelector('fieldset');
    if (fieldset instanceof HTMLElement) {
      fieldset.replaceChildren(body);
    } else {
      Array.from(rentRoot.children).forEach((child) => {
        if (child !== summary && !child.matches('input[type="range"]')) child.remove();
      });
      rentRoot.appendChild(body);
    }

    const sync = (changedInput) => {
      let low = Number(lowInput.value || floor);
      let high = Number(highInput.value || ceiling);

      if (low > high) {
        if (changedInput === lowInput) {
          low = high;
          lowInput.value = String(high);
        } else {
          high = low;
          highInput.value = String(low);
        }
      }

      const span = Math.max(ceiling - floor, 1);
      const start = Math.max(0, Math.min(100, ((low - floor) / span) * 100));
      const end = Math.max(0, Math.min(100, ((high - floor) / span) * 100));

      body.style.setProperty('--rent-start', start + '%');
      body.style.setProperty('--rent-end', end + '%');
      lowValue.textContent = 'от $ ' + low.toLocaleString('ru-RU');
      highValue.textContent = 'до $ ' + high.toLocaleString('ru-RU') + ' за м²';
    };

    lowInput.addEventListener('input', () => sync(lowInput));
    if (highInput !== lowInput) {
      highInput.addEventListener('input', () => sync(highInput));
    }

    form.querySelector('[data-filter-reset], .toolbar-reset')?.addEventListener('click', () => {
      window.setTimeout(() => sync(), 0);
    });

    sync();
  };

  setupCompactRentFilter();
  window.setTimeout(setupCompactRentFilter, 100);
  /* ARENDASKLADA_RENT_INLINE_COMPACT_END */
  /* ARENDASKLADA_RENT_DROPDOWN_RESTORE_START */
  const rentDropdown = Array.from(document.querySelectorAll('[data-property-filters] details')).find((node) => {
    const summaryText = String(node.querySelector('summary')?.textContent || '');
    return /ставка\s+аренды/i.test(summaryText) || Boolean(node.querySelector('input[type="range"]'));
  });

  if (rentDropdown instanceof HTMLDetailsElement) {
    rentDropdown.open = false;
    rentDropdown.classList.remove('catalog-rent-inline', 'is-inline', 'rent-inline');
    rentDropdown.removeAttribute('style');

    const summary = rentDropdown.querySelector('summary');
    summary?.removeAttribute('aria-disabled');
    summary?.removeAttribute('style');

    const walker = document.createTreeWalker(rentDropdown, NodeFilter.SHOW_TEXT);
    const removeNodes = [];
    while (walker.nextNode()) {
      const text = String(walker.currentNode.nodeValue || '').replace(/\+s/g, ' ').trim();
      if (/объекты.*по запросу|объекты без ставки аренды/i.test(text)) {
        removeNodes.push(walker.currentNode.parentElement || walker.currentNode);
      }
    }
    removeNodes.forEach((node) => node.remove());
  }
    /* ARENDASKLADA_RENT_DROPDOWN_RESTORE_END */
  /* RENT_POPUP_MARKER_START */
  const rd=[...document.querySelectorAll('[data-property-filters] details')].find(d=>/ставка\s+аренды/i.test(d.querySelector('summary')?.textContent||''));
  if(rd instanceof HTMLDetailsElement){const sm=rd.querySelector(':scope>summary');rd.classList.remove('catalog-rent-inline','rent-inline','is-inline');rd.classList.add('rent-rate-filter');rd.removeAttribute('style');rd.open=false;sm?.removeAttribute('style');sm?.removeAttribute('aria-disabled');let pop=rd.querySelector(':scope>.rent-rate-popup');if(!(pop instanceof HTMLElement)){pop=document.createElement('div');pop.className='rent-rate-popup';[...rd.children].filter(x=>x!==sm).forEach(x=>pop.append(x));rd.append(pop)}}
  const mark=(o,on)=>{o=String(o||'');if(!o)return;document.querySelectorAll('[data-property-marker],.leaflet-status-dot,.yandex-status-dot').forEach(m=>{if(String(m.getAttribute('data-order')||'')===o)m.classList.toggle('is-card-hovered',on)})};
  document.querySelectorAll('[data-property-card]').forEach(c=>{const o=c.getAttribute('data-order'),on=()=>mark(o,true),off=()=>mark(o,false);c.addEventListener('pointerenter',on);c.addEventListener('pointerleave',off);c.addEventListener('focusin',on);c.addEventListener('focusout',off)});
  /* RENT_POPUP_MARKER_END */
});

/* ARENDASKLADA_RENT_MARKER_RECOVERY_START */
(() => {
  const setupRentAndMarkerHover = () => {
    const filters = document.querySelector('[data-property-filters]');

    if (filters instanceof HTMLElement) {
      const rentDetails = Array.from(filters.querySelectorAll('details')).find((details) => {
        const title = String(details.querySelector(':scope > summary')?.textContent || '');
        return /ставка\s+аренды/i.test(title) || Boolean(details.querySelector('input[type="range"]'));
      });

      if (rentDetails instanceof HTMLDetailsElement) {
        rentDetails.classList.add('catalog-rent-fixed');
        rentDetails.open = false;
        rentDetails.removeAttribute('style');

        const previousSummary = rentDetails.querySelector(':scope > summary');
        if (previousSummary instanceof HTMLElement && previousSummary.dataset.rentRecovered !== 'true') {
          const summary = previousSummary.cloneNode(true);
          summary.dataset.rentRecovered = 'true';
          summary.removeAttribute('aria-disabled');
          summary.removeAttribute('style');
          previousSummary.replaceWith(summary);

          summary.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            rentDetails.open = !rentDetails.open;
          }, true);
        }

        const summary = rentDetails.querySelector(':scope > summary');
        const panel = Array.from(rentDetails.children).find((node) => node !== summary);

        if (panel instanceof HTMLElement) {
          panel.classList.add('catalog-rent-panel');
          panel.removeAttribute('style');

          Array.from(panel.querySelectorAll('p, small, div, span')).forEach((node) => {
            const text = String(node.textContent || '').replace(/\s+/g, ' ').trim();
            if (
              /объекты.*по запросу/i.test(text) ||
              /объекты без ставки аренды/i.test(text) ||
              /пока диапазон не измен/i.test(text)
            ) {
              node.remove();
            }
          });
        }
      }
    }

    document.querySelectorAll('[data-property-card]').forEach((card) => {
      if (!(card instanceof HTMLElement) || card.dataset.markerZoomRecovered === 'true') {
        return;
      }

      card.dataset.markerZoomRecovered = 'true';

      const toggleMarker = (active) => {
        const order = String(card.getAttribute('data-order') || '');
        if (!order) return;

        const selector = [
          '[data-yandex-map] [data-order]',
          '.catalog-map-panel [data-order]',
          '[data-property-marker][data-order]',
          '.hero-yandex-point[data-order]',
          '.leaflet-status-dot[data-order]',
          '.yandex-status-dot[data-order]'
        ].join(',');

        document.querySelectorAll(selector).forEach((marker) => {
          if (marker === card) return;
          if (String(marker.getAttribute('data-order') || '') === order) {
            marker.classList.toggle('is-card-hovered-150', active);
          }
        });
      };

      card.addEventListener('mouseenter', () => toggleMarker(true));
      card.addEventListener('mouseleave', () => toggleMarker(false));
      card.addEventListener('focusin', () => toggleMarker(true));
      card.addEventListener('focusout', () => toggleMarker(false));
    });
  };

  const start = () => {
    setupRentAndMarkerHover();
    window.setTimeout(setupRentAndMarkerHover, 800);
    window.setTimeout(setupRentAndMarkerHover, 1800);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
/* ARENDASKLADA_RENT_MARKER_RECOVERY_END */
