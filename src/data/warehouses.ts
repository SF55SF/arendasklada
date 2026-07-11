// Legacy static data kept for compatibility. The live catalog is generated from src/content/warehouses/*.md.
export type Warehouse = {
  block: string;
  floor: string;
  area: number;
  workplaces: string;
  ready: string;
  layout: string;
  title: string;
  features: string[];
  presentationFile: string;
};

export const warehouses: Warehouse[] = [
  {
    block: 'Складской объект, Сергелийский район',
    floor: 'B+',
    area: 1500,
    workplaces: '8 м',
    ready: 'Доступен сейчас',
    layout: 'сухой склад',
    title: 'Склад 1500 м² в Сергелийском районе',
    features: ['1500 м²', 'Сергелийский район', 'сухой склад'],
    presentationFile: '/files/placeholder-presentation-1.pdf',
  },
  {
    block: 'Производственно-складской объект, Яшнабад',
    floor: 'B',
    area: 3200,
    workplaces: '9 м',
    ready: 'Доступен сейчас',
    layout: 'производственно-складское помещение',
    title: 'Производственно-складской объект 3200 м² в Яшнабаде',
    features: ['3200 м²', 'Яшнабадский район', 'производственно-складской формат'],
    presentationFile: '/files/placeholder-presentation-2.pdf',
  },
  {
    block: 'Индустриальный объект, Юнусабад',
    floor: 'A',
    area: 7800,
    workplaces: '10–12 м',
    ready: 'По запросу',
    layout: 'light industrial',
    title: 'Индустриальный объект 7800 м² в Юнусабадском районе',
    features: ['7800 м²', 'Юнусабадский район', 'light industrial'],
    presentationFile: '/files/placeholder-presentation-3.pdf',
  },
];
