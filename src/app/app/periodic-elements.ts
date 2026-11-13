const elementNames = `H|Hidrógeno
He|Helio
Li|Litio
Be|Berilio
B|Boro
C|Carbono
N|Nitrógeno
O|Oxígeno
F|Flúor
Ne|Neón
Na|Sodio
Mg|Magnesio
Al|Aluminio
Si|Silicio
P|Fósforo
S|Azufre
Cl|Cloro
Ar|Argón
K|Potasio
Ca|Calcio
Sc|Escandio
Ti|Titanio
V|Vanadio
Cr|Cromo
Mn|Manganeso
Fe|Hierro
Co|Cobalto
Ni|Níquel
Cu|Cobre
Zn|Zinc
Ga|Galio
Ge|Germanio
As|Arsénico
Se|Selenio
Br|Bromo
Kr|Kriptón
Rb|Rubidio
Sr|Estroncio
Y|Itrio
Zr|Circonio
Nb|Niobio
Mo|Molibdeno
Tc|Tecnecio
Ru|Rutenio
Rh|Rodio
Pd|Paladio
Ag|Plata
Cd|Cadmio
In|Indio
Sn|Estaño
Sb|Antimonio
Te|Telurio
I|Yodo
Xe|Xenón
Cs|Cesio
Ba|Bario
La|Lantano
Ce|Cerio
Pr|Praseodimio
Nd|Neodimio
Pm|Prometio
Sm|Samario
Eu|Europio
Gd|Gadolinio
Tb|Terbio
Dy|Disprosio
Ho|Holmio
Er|Erbio
Tm|Tulio
Yb|Iterbio
Lu|Lutecio
Hf|Hafnio
Ta|Tantalio
W|Wolframio
Re|Renio
Os|Osmio
Ir|Iridio
Pt|Platino
Au|Oro
Hg|Mercurio
Tl|Talio
Pb|Plomo
Bi|Bismuto
Po|Polonio
At|Astato
Rn|Radón
Fr|Francio
Ra|Radio
Ac|Actinio
Th|Torio
Pa|Protactinio
U|Uranio
Np|Neptunio
Pu|Plutonio
Am|Americio
Cm|Curio
Bk|Berkelio
Cf|Californio
Es|Einsteinio
Fm|Fermio
Md|Mendelevio
No|Nobelio
Lr|Lawrencio
Rf|Rutherfordio
Db|Dubnio
Sg|Seaborgio
Bh|Bohrio
Hs|Hassio
Mt|Meitnerio
Ds|Darmstadtio
Rg|Roentgenio
Cn|Copernicio
Nh|Nihonio
Fl|Flerovio
Mc|Moscovio
Lv|Livermorio
Ts|Teneso
Og|Oganesón`;

const mainRows = [
  [1, ...Array(16).fill(0), 2],
  [3, 4, ...Array(10).fill(0), 5, 6, 7, 8, 9, 10],
  [11, 12, ...Array(10).fill(0), 13, 14, 15, 16, 17, 18],
  Array.from({ length: 18 }, (_, i) => i + 19),
  Array.from({ length: 18 }, (_, i) => i + 37),
  [55, 56, 57, ...Array.from({ length: 15 }, (_, i) => i + 72)],
  [87, 88, 89, ...Array.from({ length: 15 }, (_, i) => i + 104)],
];
const positions = new Map<number, { period: number; group: number }>();
mainRows.forEach((row, periodIndex) => row.forEach((atomicNumber, index) => {
  if (atomicNumber) positions.set(atomicNumber, { period: periodIndex + 1, group: index + 1 });
}));
for (let atomicNumber = 58; atomicNumber <= 71; atomicNumber += 1) positions.set(atomicNumber, { period: 8, group: atomicNumber - 55 });
for (let atomicNumber = 90; atomicNumber <= 103; atomicNumber += 1) positions.set(atomicNumber, { period: 9, group: atomicNumber - 87 });

const pubchemByNumber = new Map((pubchemElements as PubChemElement[]).map((element) => [Number(element.AtomicNumber), element]));

export const periodicElements = elementNames.split("\n").map((line, index) => {
  const [symbol, name] = line.split("|");
  const atomicNumber = index + 1;
  const properties = pubchemByNumber.get(atomicNumber);
  return {
    atomicNumber, symbol, name, ...positions.get(atomicNumber)!,
    englishName: properties?.Name || name,
    atomicWeight: properties?.AtomicWeight || "",
    electronConfiguration: properties?.ElectronConfiguration || "",
    electronegativity: properties?.Electronegativity || "",
    ionizationEnergy: properties?.IonizationEnergy || "",
    oxidationStates: properties?.OxidationStates || "",
    standardState: properties?.StandardState || "",
    category: properties?.GroupBlock || "",
    yearDiscovered: properties?.YearDiscovered || "",
  };
});
import pubchemElements from "./periodic-data.json" with { type: "json" };

type PubChemElement = {
  AtomicNumber: string; Symbol: string; Name: string; AtomicWeight: string; ElectronConfiguration: string;
  Electronegativity: string; IonizationEnergy: string; OxidationStates: string; StandardState: string;
  GroupBlock: string; YearDiscovered: string;
};

