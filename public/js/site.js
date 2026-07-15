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
    normalizeText(availability).includes('стро') ? '#c7cbd1' : '#555b63';

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
          html: `<span class="leaflet-status-dot ${isBuilding ? 'is-building' : 'is-ready'}" data-order="${escapeHtml(point.order || point.id)}"></span>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
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
        window.dispatchEvent(new CustomEvent('arendasklada:map-object-select', { detail: { order: String(point.order || point.id || '') } }));
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
        gridSize: 44,
      });

      /* ARENDASKLADA_YANDEX_STATUS_LAYOUT_START */
      const yandexStatusLayout = ymaps.templateLayoutFactory.createClass(
        '<div class="yandex-status-dot $[properties.statusClass]" data-order="$[properties.order]"></div>'
      );
      /* ARENDASKLADA_YANDEX_STATUS_LAYOUT_END */
      /* ARENDASKLADA_YANDEX_STACK_LAYOUT_V1 */
      const yandexStackLayout = ymaps.templateLayoutFactory.createClass(
        "<div class=\"yandex-marker-stack\" aria-hidden=\"true\"><span></span><span></span><span></span></div>"
      );

      objectManager.objects.options.set({
        iconLayout: yandexStatusLayout,
        iconShape: { type: 'Circle', coordinates: [0, 0], radius: 11 },
        hasBalloon: false,
        openBalloonOnClick: false,
        openHintOnHover: false,
      });

      objectManager.clusters.options.set({
        clusterIconLayout: yandexStackLayout,
        clusterIconShape: { type: "Rectangle", coordinates: [[-17, -15], [17, 15]] },
        clusterDisableClickZoom: false,
        clusterOpenBalloonOnClick: false,
        clusterOpenHintOnHover: false,
      });

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
            hasBalloon: false,
            openBalloonOnClick: false,
          },
          properties: {

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
        const objectId = event.get('objectId');
        const object = objectManager.objects.getById(objectId);
        const order = String(object?.properties?.order ?? objectId ?? '');
        highlightPropertyCard(order);
        window.dispatchEvent(new CustomEvent('arendasklada:map-object-select', { detail: { order } }));
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
    /* RENT_POPUP_MARKER_START */
  const rd=[...document.querySelectorAll('[data-property-filters] details')].find(d=>/ставка\s+аренды/i.test(d.querySelector('summary')?.textContent||''));
  if(rd instanceof HTMLDetailsElement){const sm=rd.querySelector(':scope>summary');rd.classList.remove('catalog-rent-inline','rent-inline','is-inline');rd.classList.add('rent-rate-filter');rd.removeAttribute('style');rd.open=false;sm?.removeAttribute('style');sm?.removeAttribute('aria-disabled');let pop=rd.querySelector(':scope>.rent-rate-popup');if(!(pop instanceof HTMLElement)){pop=document.createElement('div');pop.className='rent-rate-popup';[...rd.children].filter(x=>x!==sm).forEach(x=>pop.append(x));rd.append(pop)}}
  const mark=(o,on)=>{o=String(o||'');if(!o)return;document.querySelectorAll('[data-property-marker],.leaflet-status-dot,.yandex-status-dot').forEach(m=>{if(String(m.getAttribute('data-order')||'')===o)m.classList.toggle('is-card-hovered',on)})};
  document.querySelectorAll('[data-property-card]').forEach(c=>{const o=c.getAttribute('data-order'),on=()=>mark(o,true),off=()=>mark(o,false);c.addEventListener('pointerenter',on);c.addEventListener('pointerleave',off);c.addEventListener('focusin',on);c.addEventListener('focusout',off)});
  /* RENT_POPUP_MARKER_END */
  /* ARENDASKLADA_RENT_RIGHT_RESTORE_START */
  const restoreRentRight = () => {
    const form = document.querySelector('#warehouses [data-property-filters]');
    if (!(form instanceof HTMLFormElement)) return;

    const rent = Array.from(form.querySelectorAll('details')).find((details) => {
      const title = String(details.querySelector('summary')?.textContent || '');
      return /ставка\s+аренды/i.test(title) || Boolean(details.querySelector('[data-rent-filter]'));
    });

    if (!(rent instanceof HTMLDetailsElement)) return;

    rent.classList.add('toolbar-filter', 'toolbar-filter--rent');
    rent.classList.remove('catalog-rent-inline', 'catalog-rent-dropdown', 'is-inline', 'rent-inline');
    rent.removeAttribute('style');

    const summary = rent.querySelector('summary');
    if (summary instanceof HTMLElement) {
      summary.removeAttribute('aria-disabled');
      summary.removeAttribute('style');
      summary.style.pointerEvents = 'auto';
      summary.style.cursor = 'pointer';
    }

    const panel = rent.querySelector('[data-rent-filter]');
    if (panel instanceof HTMLElement) {
      panel.classList.add('rent-range-panel');
      panel.classList.remove('catalog-rent-inline__panel', 'catalog-rent-panel');
      panel.removeAttribute('style');
    }

    if (form.dataset.rentRightRestoreBound !== 'true') {
      form.dataset.rentRightRestoreBound = 'true';
      document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const clickedSummary = target.closest('#warehouses .toolbar-filter--rent > summary');
        if (!clickedSummary || clickedSummary !== summary) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        rent.open = !rent.open;
      }, true);
    }
  };

  restoreRentRight();
  /* ARENDASKLADA_RENT_RIGHT_RESTORE_END */
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

/* ARENDASKLADA_RENT_LIMIT_18_START */
(() => {
  const setupRentLimit = () => {
    const panel = document.querySelector('#warehouses [data-rent-filter]');
    if (!(panel instanceof HTMLElement)) return;

    const minInput = panel.querySelector('[data-rent-min]');
    const maxInput = panel.querySelector('[data-rent-max]');
    if (!(minInput instanceof HTMLInputElement) || !(maxInput instanceof HTMLInputElement)) return;

    const lowerLimit = Math.ceil(Number(minInput.min || minInput.value || 0));
    const upperLimit = 18;

    [minInput, maxInput].forEach((input) => {
      input.max = String(upperLimit);
      input.step = '1';
    });

    if (Number(minInput.value) > upperLimit) {
      minInput.value = String(upperLimit);
    }

    maxInput.value = String(upperLimit);
    maxInput.defaultValue = String(upperLimit);
    maxInput.setAttribute('value', String(upperLimit));
    maxInput.setAttribute('data-default-value', String(upperLimit));
    panel.setAttribute('data-default-max', String(upperLimit));

    const maxOutput = panel.querySelector('[data-rent-max-output]');
    if (maxOutput) maxOutput.textContent = String(upperLimit);

    const range = panel.querySelector('.rent-dual-range');
    if (range instanceof HTMLElement) {
      range.style.setProperty('--rent-max', String(upperLimit));

      let scale = panel.querySelector('.rent-dollar-scale');
      if (!(scale instanceof HTMLElement)) {
        scale = document.createElement('div');
        scale.className = 'rent-dollar-scale';
        scale.setAttribute('aria-hidden', 'true');
        range.insertAdjacentElement('afterend', scale);
      }

      const values = [];
      for (let value = lowerLimit; value <= upperLimit; value += 1) values.push(value);
      scale.style.setProperty('--rent-tick-count', String(Math.max(values.length, 1)));
      scale.replaceChildren(...values.map((value) => {
        const tick = document.createElement('span');
        tick.textContent = value + '$';
        return tick;
      }));
    }

    maxInput.dispatchEvent(new Event('input', { bubbles: true }));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupRentLimit, { once: true });
  } else {
    setupRentLimit();
  }
})();
/* ARENDASKLADA_RENT_LIMIT_18_END */

/* ARENDASKLADA_RENT_EDGE_LABELS_START */
(() => {
  const setupRentRange = () => {
    const details = Array.from(
      document.querySelectorAll('#warehouses [data-property-filters] details')
    ).find((node) =>
      Boolean(node.querySelector('[data-rent-filter]')) ||
      /ставка\s+аренды/i.test(String(node.querySelector('summary')?.textContent || ''))
    );

    if (!(details instanceof HTMLDetailsElement)) return;

    const panel = details.querySelector('[data-rent-filter]');
    const minInput = panel?.querySelector('[data-rent-min]');
    const maxInput = panel?.querySelector('[data-rent-max]');
    const range = panel?.querySelector('.rent-dual-range');

    if (
      !(panel instanceof HTMLElement) ||
      !(minInput instanceof HTMLInputElement) ||
      !(maxInput instanceof HTMLInputElement) ||
      !(range instanceof HTMLElement)
    ) return;

    details.classList.add('toolbar-filter--rent');

    [minInput, maxInput].forEach((input) => {
      input.max = '18';
      input.step = '1';
    });

    if (!Number.isFinite(Number(maxInput.value)) || Number(maxInput.value) > 18) {
      maxInput.value = '18';
    }

    maxInput.defaultValue = '18';
    maxInput.setAttribute('data-default-value', '18');
    panel.setAttribute('data-default-max', '18');

    let minLabel = range.querySelector('[data-rent-thumb-min]');
    let maxLabel = range.querySelector('[data-rent-thumb-max]');

    if (!(minLabel instanceof HTMLOutputElement)) {
      minLabel = document.createElement('output');
      minLabel.className = 'rent-thumb-label rent-thumb-label--min';
      minLabel.setAttribute('data-rent-thumb-min', '');
      range.append(minLabel);
    }

    if (!(maxLabel instanceof HTMLOutputElement)) {
      maxLabel = document.createElement('output');
      maxLabel.className = 'rent-thumb-label rent-thumb-label--max';
      maxLabel.setAttribute('data-rent-thumb-max', '');
      range.append(maxLabel);
    }

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const sync = () => {
      const absoluteMin = Number(minInput.min || 0);
      const absoluteMax = 18;
      const span = Math.max(absoluteMax - absoluteMin, 1);

      let minValue = clamp(Math.round(Number(minInput.value) || absoluteMin), absoluteMin, absoluteMax);
      let maxValue = clamp(Math.round(Number(maxInput.value) || absoluteMax), absoluteMin, absoluteMax);

      if (minValue > maxValue) minValue = maxValue;

      minInput.value = String(minValue);
      maxInput.value = String(maxValue);

      minLabel.value = String(minValue) + ' $';
      minLabel.textContent = String(minValue) + ' $';
      maxLabel.value = String(maxValue) + ' $';
      maxLabel.textContent = String(maxValue) + ' $';

      const minOutput = panel.querySelector('[data-rent-min-output]');
      const maxOutput = panel.querySelector('[data-rent-max-output]');
      if (minOutput) minOutput.textContent = String(minValue);
      if (maxOutput) maxOutput.textContent = String(maxValue);

      panel.style.setProperty('--rent-low', String(((minValue - absoluteMin) / span) * 100) + '%');
      panel.style.setProperty('--rent-high', String(((maxValue - absoluteMin) / span) * 100) + '%');

      const width = range.clientWidth;
      if (width <= 0) return;

      const trackInset = 12;
      const trackWidth = Math.max(width - trackInset * 2, 1);
      const minX = trackInset + ((minValue - absoluteMin) / span) * trackWidth;
      const maxX = trackInset + ((maxValue - absoluteMin) / span) * trackWidth;

      const placeLabel = (label, x) => {
        const halfWidth = Math.max(label.offsetWidth / 2, 22);
        const safeLeft = clamp(x, halfWidth + 3, width - halfWidth - 3);
        label.style.left = String(safeLeft) + 'px';
      };

      placeLabel(minLabel, minX);
      placeLabel(maxLabel, maxX);
    };

    if (range.dataset.rentFinalBoundsBound !== 'true') {
      range.dataset.rentFinalBoundsBound = 'true';
      minInput.addEventListener('input', sync);
      maxInput.addEventListener('input', sync);
      minInput.addEventListener('change', sync);
      maxInput.addEventListener('change', sync);
      details.addEventListener('toggle', () => {
        if (details.open) window.requestAnimationFrame(sync);
      });
      window.addEventListener('resize', sync);
    }

    sync();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupRentRange, { once: true });
  } else {
    setupRentRange();
  }
})();
/* ARENDASKLADA_RENT_EDGE_LABELS_END */

/* ARENDASKLADA_CTRL_MAP_ZOOM_V1_START */
(() => {
  const setup = () => {
    let hoveredMap = null;
    let leftCtrlDown = false;

    const setNativeZoom = (mapNode, enabled) => {
      const state = mapNode && mapNode.__arendaYandexMap;

      if (state?.map?.behaviors) {
        if (enabled) state.map.behaviors.enable('scrollZoom');
        else state.map.behaviors.disable('scrollZoom');
      }

      if (state?.leafletMap?.scrollWheelZoom) {
        if (enabled) state.leafletMap.scrollWheelZoom.enable();
        else state.leafletMap.scrollWheelZoom.disable();
      }
    };

    const syncMap = (mapNode) => {
      if (!(mapNode instanceof HTMLElement)) return;
      const active = hoveredMap === mapNode && leftCtrlDown;
      mapNode.classList.toggle('map-ctrl-active', active);
      setNativeZoom(mapNode, active);

      const text = mapNode.querySelector('.map-ctrl-hint__text');
      if (text) {
        text.textContent = active
          ? 'Масштабирование включено'
          : 'Удерживайте левый Ctrl и прокручивайте колесо';
      }
    };

    const bindMap = (mapNode) => {
      if (!(mapNode instanceof HTMLElement) || mapNode.dataset.ctrlZoomBound === 'true') return;
      mapNode.dataset.ctrlZoomBound = 'true';
      mapNode.classList.add('map-ctrl-zoom');

      const hint = document.createElement('div');
      hint.className = 'map-ctrl-hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.innerHTML = '<kbd>Ctrl</kbd><span class="map-ctrl-hint__plus">+</span><span class="map-ctrl-hint__wheel">колесо</span><span class="map-ctrl-hint__text">Удерживайте левый Ctrl и прокручивайте колесо</span>';
      mapNode.appendChild(hint);

      const disableLater = () => setNativeZoom(mapNode, false);
      disableLater();
      window.setTimeout(disableLater, 250);
      window.setTimeout(disableLater, 900);
      window.setTimeout(disableLater, 1800);

      mapNode.addEventListener('pointerenter', () => {
        hoveredMap = mapNode;
        mapNode.classList.add('map-ctrl-hover');
        syncMap(mapNode);
      });

      mapNode.addEventListener('pointerleave', () => {
        mapNode.classList.remove('map-ctrl-hover', 'map-ctrl-active');
        if (hoveredMap === mapNode) hoveredMap = null;
        setNativeZoom(mapNode, false);
      });

      mapNode.addEventListener('wheel', (event) => {
        if (leftCtrlDown && hoveredMap === mapNode) event.preventDefault();
      }, { passive: false, capture: true });
    };

    const bindAllMaps = () => {
      document.querySelectorAll('[data-yandex-map]').forEach(bindMap);
    };

    bindAllMaps();
    const observer = new MutationObserver(bindAllMaps);
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('keydown', (event) => {
      if (event.code !== 'ControlLeft' || event.repeat) return;
      leftCtrlDown = true;
      syncMap(hoveredMap);
    });

    document.addEventListener('keyup', (event) => {
      if (event.code !== 'ControlLeft') return;
      leftCtrlDown = false;
      syncMap(hoveredMap);
    });

    window.addEventListener('blur', () => {
      leftCtrlDown = false;
      syncMap(hoveredMap);
    });

    const setMarkerScale = (order, active) => {
      const value = String(order || '');
      if (!value) return;

      document.querySelectorAll([
        '[data-property-marker][data-order]',
        '.hero-yandex-point[data-order]',
        '.leaflet-status-dot[data-order]',
        '.yandex-status-dot[data-order]',
        '[data-yandex-map] [data-order]'
      ].join(',')).forEach((marker) => {
        if (String(marker.getAttribute('data-order') || '') === value) {
          marker.classList.toggle('is-card-hovered-150', active);
        }
      });
    };

    document.addEventListener('pointerover', (event) => {
      const card = event.target instanceof Element ? event.target.closest('[data-property-card]') : null;
      if (!(card instanceof HTMLElement)) return;
      const from = event.relatedTarget;
      if (from instanceof Node && card.contains(from)) return;
      setMarkerScale(card.getAttribute('data-order'), true);
    });

    document.addEventListener('pointerout', (event) => {
      const card = event.target instanceof Element ? event.target.closest('[data-property-card]') : null;
      if (!(card instanceof HTMLElement)) return;
      const to = event.relatedTarget;
      if (to instanceof Node && card.contains(to)) return;
      setMarkerScale(card.getAttribute('data-order'), false);
    });

    document.addEventListener('focusin', (event) => {
      const card = event.target instanceof Element ? event.target.closest('[data-property-card]') : null;
      if (card) setMarkerScale(card.getAttribute('data-order'), true);
    });

    document.addEventListener('focusout', (event) => {
      const card = event.target instanceof Element ? event.target.closest('[data-property-card]') : null;
      if (!(card instanceof HTMLElement)) return;
      const next = event.relatedTarget;
      if (!(next instanceof Node) || !card.contains(next)) {
        setMarkerScale(card.getAttribute('data-order'), false);
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once: true });
  } else {
    setup();
  }
})();
/* ARENDASKLADA_CTRL_MAP_ZOOM_V1_END */

/* ARENDASKLADA_CARD_MARKER_SCALE_V3_START */
(() => {
  const boot = () => {
    if (document.documentElement.dataset.markerScaleV3 === 'true') return;
    document.documentElement.dataset.markerScaleV3 = 'true';

    let activeOrder = '';
    const markerSelector = [
      '[data-property-marker][data-order]',
      '.hero-yandex-point[data-order]',
      '.leaflet-status-dot[data-order]',
      '.yandex-status-dot[data-order]'
    ].join(',');

    const visualMarker = (node) => {
      if (!(node instanceof HTMLElement)) return null;
      if (node.matches('.leaflet-status-dot,.yandex-status-dot,.hero-point-number')) return node;
      return node.querySelector('.leaflet-status-dot,.yandex-status-dot,.hero-point-number') || node;
    };

    const syncMarkers = () => {
      document.querySelectorAll(markerSelector).forEach((node) => {
        const marker = visualMarker(node);
        if (!(marker instanceof HTMLElement)) return;
        const order = String(node.getAttribute('data-order') || marker.getAttribute('data-order') || '');
        marker.classList.toggle('is-card-hovered-150-v3', Boolean(activeOrder && order === activeOrder));
      });
    };

    const setCard = (card) => {
      activeOrder = card instanceof HTMLElement ? String(card.getAttribute('data-order') || '') : '';
      syncMarkers();
    };

    document.addEventListener('pointerover', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const card = target.closest('[data-property-card]');
      if (!(card instanceof HTMLElement)) return;
      const previous = event.relatedTarget;
      if (previous instanceof Node && card.contains(previous)) return;
      setCard(card);
    }, true);

    document.addEventListener('pointerout', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const card = target.closest('[data-property-card]');
      if (!(card instanceof HTMLElement)) return;
      const next = event.relatedTarget;
      if (next instanceof Node && card.contains(next)) return;
      setCard(null);
    }, true);

    document.addEventListener('focusin', (event) => {
      const target = event.target;
      const card = target instanceof Element ? target.closest('[data-property-card]') : null;
      if (card instanceof HTMLElement) setCard(card);
    });

    document.addEventListener('focusout', (event) => {
      const target = event.target;
      const card = target instanceof Element ? target.closest('[data-property-card]') : null;
      if (!(card instanceof HTMLElement)) return;
      const next = event.relatedTarget;
      if (!(next instanceof Node) || !card.contains(next)) setCard(null);
    });

    const observer = new MutationObserver(() => {
      if (activeOrder) syncMarkers();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
/* ARENDASKLADA_CARD_MARKER_SCALE_V3_END */

/* ARENDASKLADA_MOBILE_PAGE_MAP_CARD_V47_START */
(()=>{const m=()=>matchMedia('(max-width:820px)').matches,z=4;let g=0;const boot=()=>{const r=document.querySelector('[data-property-cards]'),F=document.querySelector('[data-property-filters]');if(!(r instanceof HTMLElement)||r.dataset.mpg)return;r.dataset.mpg='1';const n=document.createElement('nav'),a=document.createElement('button'),t=document.createElement('span'),d=document.createElement('button');n.className='mobile-catalog-pagination';n.setAttribute('aria-label','Страницы объектов');a.type=d.type='button';a.textContent='Назад';d.textContent='Далее';t.setAttribute('aria-live','polite');n.append(a,t,d);r.after(n);const q=(x=false)=>{const c=[...r.querySelectorAll('[data-property-card]')];c.forEach(e=>e.classList.remove('mobile-page-hidden'));if(!m()){n.hidden=true;return}if(x)g=0;const v=c.filter(e=>!e.hidden),P=Math.max(1,Math.ceil(v.length/z));g=Math.max(0,Math.min(g,P-1));const k=g*z;v.forEach((e,i)=>e.classList.toggle('mobile-page-hidden',i<k||i>=k+z));n.hidden=v.length<=z;t.textContent=(g+1)+' / '+P;a.disabled=g===0;d.disabled=g>=P-1},go=x=>{g+=x;q();r.scrollIntoView({behavior:'smooth',block:'start'})};a.onclick=()=>go(-1);d.onclick=()=>go(1);F?.addEventListener('input',()=>setTimeout(()=>q(true)));F?.addEventListener('change',()=>setTimeout(()=>q(true)));F?.querySelector('[data-filter-reset]')?.addEventListener('click',()=>setTimeout(()=>q(true)));addEventListener('resize',()=>q(true));q(true);let o=document.querySelector('.mobile-map-card-popover');if(!(o instanceof HTMLElement)){o=document.createElement('div');o.className='mobile-map-card-popover';o.hidden=true;o.innerHTML='<div class="mobile-map-card-popover__panel"><button type="button" class="mobile-map-card-popover__close" aria-label="Закрыть карточку">×</button><div class="mobile-map-card-popover__slot warehouse-list"></div></div>';r.closest('#warehouses').append(o);const h=()=>{o.hidden=true;document.body.classList.remove('mobile-map-card-open')};o.querySelector('.mobile-map-card-popover__close').onclick=h;o.onclick=e=>{if(e.target===o)h()}}addEventListener('arendasklada:map-object-select',e=>{if(!m()||!(o instanceof HTMLElement))return;const x=String(e.detail?.order||''),c=[...r.querySelectorAll('[data-property-card]')].find(i=>String(i.getAttribute('data-order')||'')===x),l=o.querySelector('.mobile-map-card-popover__slot');if(!(c instanceof HTMLElement)||!(l instanceof HTMLElement))return;const v=c.cloneNode(true);v.hidden=false;v.removeAttribute('data-property-card');v.classList.remove('mobile-page-hidden','is-map-hovered');l.replaceChildren(v);o.hidden=false;document.body.classList.add('mobile-map-card-open')});const C=()=>{if(!m())return;document.querySelectorAll('[data-yandex-map]').forEach(e=>{e.querySelectorAll('.map-ctrl-hint').forEach(i=>i.remove());e.classList.remove('map-ctrl-zoom','map-ctrl-hover','map-ctrl-active');const x=e.__arendaYandexMap;x?.map?.behaviors?.disable('scrollZoom');x?.leafletMap?.scrollWheelZoom?.disable()})};C();[300,1000,2000].forEach(x=>setTimeout(C,x));new MutationObserver(C).observe(document.body,{childList:true,subtree:true})};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot()})();
/* ARENDASKLADA_MOBILE_PAGE_MAP_CARD_V47_END */

/* ARENDASKLADA_DETAIL_MOBILE_MAP_V52_START */
(()=>{const mobile=()=>matchMedia('(max-width:820px)').matches;const setup=()=>{if(!mobile())return;document.querySelectorAll('[data-detail-ctrl-map]').forEach((frame)=>{if(!(frame instanceof HTMLElement)||frame.dataset.mobileMapReady==='1')return;frame.dataset.mobileMapReady='1';frame.querySelectorAll('.detail-map-wheel-shield,.detail-map-ctrl-hint').forEach((node)=>node.remove());const button=document.createElement('button');button.type='button';button.className='detail-map-use-toggle';button.textContent='Управлять картой';button.addEventListener('click',()=>{const active=frame.classList.toggle('is-map-active');button.textContent=active?'Прокручивать страницу':'Управлять картой'});frame.append(button)})};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',setup,{once:true}):setup()})();
/* ARENDASKLADA_DETAIL_MOBILE_MAP_V52_END */

/* ARENDASKLADA_MOBILE_MAP_RESET_V58_START */
addEventListener('click',e=>{const b=e.target instanceof Element?e.target.closest('.map-reset-view'):null;if(!b)return;const m=b.closest('.catalog-map-panel')?.querySelector('[data-yandex-map]'),s=m?.__arendaYandexMap;if(s?.map){const x=s.objectManager?.getBounds?.();if(x)s.map.setBounds(x,{checkZoomRange:true,zoomMargin:[70,70,110,70]})}else if(s?.leafletMap){const x=(s.leafletMarkers||[]).map(v=>v.marker.getLatLng());if(x.length)s.leafletMap.fitBounds(x,{padding:[46,46],maxZoom:13})}});
/* ARENDASKLADA_MOBILE_MAP_RESET_V58_END */
