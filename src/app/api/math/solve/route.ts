import { authorizeMath } from "@/lib/math-access";
import { expressionValue, solveEquation, solveExpression, validateGraphExpression } from "@/lib/math-engine";

const unitMap: Record<string, { name: string; factor: number; family: string }> = {
  mm:{name:"Milímetros",factor:.001,family:"longitud"},cm:{name:"Centímetros",factor:.01,family:"longitud"},m:{name:"Metros",factor:1,family:"longitud"},km:{name:"Kilómetros",factor:1000,family:"longitud"},in:{name:"Pulgadas",factor:.0254,family:"longitud"},ft:{name:"Pies",factor:.3048,family:"longitud"},
  mg:{name:"Miligramos",factor:.001,family:"masa"},g:{name:"Gramos",factor:1,family:"masa"},kg:{name:"Kilogramos",factor:1000,family:"masa"},lb:{name:"Libras",factor:453.59237,family:"masa"},
  ms:{name:"Milisegundos",factor:.001,family:"tiempo"},s:{name:"Segundos",factor:1,family:"tiempo"},min:{name:"Minutos",factor:60,family:"tiempo"},h:{name:"Horas",factor:3600,family:"tiempo"},day:{name:"Días",factor:86400,family:"tiempo"},
};
const round = (number: number) => new Intl.NumberFormat("es-UY", { maximumFractionDigits: 8 }).format(number);
function numberValue(values: Record<string, unknown>, key: string) {
  const value = values[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Escribe un valor válido para ${key}.`);
  return value;
}

export async function POST(request: Request) {
  const access = await authorizeMath();
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status, headers: { "Cache-Control": "no-store" } });
  let body: Record<string, unknown>;
  try { const parsed: unknown = await request.json(); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(); body = parsed as Record<string, unknown>; }
  catch { return Response.json({ error: "La solicitud no tiene un formato válido." }, { status: 400 }); }
  try {
    const source = typeof body.source === "string" ? body.source.trim().slice(0, 3000) : "";
    if (body.action === "expression") {
      if (!source) throw new Error("Escribe una expresión para resolver.");
      return Response.json({ result: solveExpression(source) }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (body.action === "equation") {
      if (!source) throw new Error("Escribe una ecuación para resolver.");
      return Response.json({ result: solveEquation(source, body.mode === "inequality" ? "inequality" : "equation") }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (body.action === "graph") {
      if (!Array.isArray(body.expressions) || body.expressions.length < 1 || body.expressions.length > 2 || body.expressions.some(item => typeof item !== "string" || item.length > 1000)) throw new Error("La expresión de la gráfica no es válida.");
      return Response.json({ expressions: body.expressions.map(validateGraphExpression) }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (body.action === "geometry") {
      const values = body.values && typeof body.values === "object" && !Array.isArray(body.values) ? body.values as Record<string, unknown> : {};
      const kind = body.kind;
      const requiredByKind: Record<string, string[]> = {
        triangle: ["base", "height", "sideA", "sideB"], circle: ["radius"], rectangle: ["width", "height"], polygon: ["side", "sides"],
        cuboid: ["length", "width", "height"], sphere: ["radius"], cylinder: ["radius", "height"], angles: ["angleA", "angleB"], pythagorean: ["legA", "legB"],
      };
      const required = typeof kind === "string" ? requiredByKind[kind] : undefined;
      if (!required) throw new Error("La figura solicitada no está disponible.");
      const p: Record<string, number> = {};
      for (const [key, value] of Object.entries(values)) { const number = typeof value === "number" ? value : Number(value); if (!Number.isFinite(number)) throw new Error(`Escribe una medida válida para ${key}.`); p[key] = number; }
      for (const key of required) if (p[key] === undefined) throw new Error(`Falta una medida válida para ${key}.`);
      if (Object.values(p).some(value => value < 0)) throw new Error("Las dimensiones no pueden ser negativas.");
      let rows: {label:string;value:string;formula:string}[];
      const row=(label:string,value:number,formula:string)=>{if(!Number.isFinite(value))throw new Error("El resultado queda fuera del rango numérico permitido.");return{label,value:round(value),formula};};
      if (kind === "triangle") { const {base,height,sideA,sideB}=p;if(![base,height,sideA,sideB].every(value=>value>0)||sideA+sideB<=base||sideA+base<=sideB||sideB+base<=sideA)throw new Error("Las medidas deben formar un triángulo válido.");const s=(base+sideA+sideB)/2,area=Math.sqrt(s*(s-base)*(s-sideA)*(s-sideB)),expected=2*area/base;if(Math.abs(expected-height)>.01*Math.max(1,expected))throw new Error(`Para esos lados, la altura debe ser aproximadamente ${round(expected)}.`);rows=[row("Área",area,"base × altura / 2"),row("Perímetro",base+sideA+sideB,"base + lado A + lado B")]; }
      else if(kind==="circle"){rows=[row("Área",Math.PI*p.radius**2,"π × radio²"),row("Longitud de la circunferencia",2*Math.PI*p.radius,"2 × π × radio")];}
      else if(kind==="rectangle"){rows=[row("Área",p.width*p.height,"base × altura"),row("Perímetro",2*(p.width+p.height),"2 × (base + altura)")];}
      else if(kind==="polygon"){if(!Number.isInteger(p.sides)||p.sides<3||p.sides>20)throw new Error("El polígono debe tener entre 3 y 20 lados enteros.");rows=[row("Área",p.sides*p.side**2/(4*Math.tan(Math.PI/p.sides)),"n × lado² / (4 × tan(π/n))"),row("Perímetro",p.sides*p.side,"n × lado")];}
      else if(kind==="cuboid"){rows=[row("Volumen",p.length*p.width*p.height,"largo × ancho × alto"),row("Área superficial",2*(p.length*p.width+p.length*p.height+p.width*p.height),"2(largo×ancho + largo×alto + ancho×alto)")];}
      else if(kind==="sphere"){rows=[row("Volumen",4*Math.PI*p.radius**3/3,"(4/3) × π × radio³"),row("Área superficial",4*Math.PI*p.radius**2,"4 × π × radio²")];}
      else if(kind==="cylinder"){rows=[row("Volumen",Math.PI*p.radius**2*p.height,"π × radio² × altura"),row("Área total",2*Math.PI*p.radius*(p.radius+p.height),"2πr(r + h)")];}
      else if(kind==="angles"){const third=180-p.angleA-p.angleB;const valid=p.angleA>0&&p.angleB>0&&third>0;rows=[{label:"Ángulo C",value:`${round(third)}°`,formula:"180° − A − B"},{label:"Comprobación",value:valid?"Los tres ángulos forman un triángulo":"Los ángulos ingresados no forman un triángulo",formula:`${round(p.angleA)}° + ${round(p.angleB)}° + ${round(third)}° = 180°`}];}
      else if(kind==="pythagorean"){const hyp=Math.hypot(p.legA,p.legB);rows=[row("Hipotenusa",hyp,"c = √(a² + b²)"),row("Comprobación",hyp**2,`${round(p.legA)}² + ${round(p.legB)}² = c²`)];}
      else throw new Error("La figura solicitada no está disponible.");
      return Response.json({ rows }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (body.action === "calculation") {
      const values = body.values && typeof body.values === "object" && !Array.isArray(body.values) ? body.values as Record<string, unknown> : {};
      const kind = body.kind;
      let answer: number, formula: string, steps: string[];
      if (kind === "rule3") { const a=numberValue(values,"a"),b=numberValue(values,"b"),c=numberValue(values,"c"); if(!a)throw new Error("A no puede ser cero en una regla de tres."); answer=b*c/a;formula="x = (B × C) / A";steps=[`x = (${round(b)} × ${round(c)}) / ${round(a)}.`,`x = ${round(answer)}.`]; }
      else if (kind === "percent") { const p=numberValue(values,"a"),total=numberValue(values,"b");answer=p*total/100;formula="Parte = porcentaje × total / 100";steps=[`(${round(p)} × ${round(total)}) / 100.`,`Parte = ${round(answer)}.`]; }
      else if (kind === "proportion") { const a=numberValue(values,"a"),b=numberValue(values,"b"),c=numberValue(values,"c");if(!a)throw new Error("El primer numerador no puede ser cero.");answer=c*b/a;formula="x = (b × c) / a";steps=[`Multiplicamos en cruz: ${round(b)} × ${round(c)}.`,`x = ${round(b*c)} / ${round(a)} = ${round(answer)}.`]; }
      else if (kind === "fraction") { const an=numberValue(values,"a"),ad=numberValue(values,"b"),bn=numberValue(values,"c"),bd=numberValue(values,"d"),op=typeof values.operation==="string"?values.operation:"+";if(![an,ad,bn,bd].every(Number.isInteger)||!ad||!bd||!["+","-","*","/"].includes(op)||op==="/"&&!bn)throw new Error("Revisa numeradores, denominadores y operación de las fracciones.");const numerator=op==="+"?an*bd+bn*ad:op==="-"?an*bd-bn*ad:op==="*"?an*bn:an*bd;const denominator=op==="*"?ad*bd:op==="/"?ad*bn:ad*bd;if(!denominator)throw new Error("No se puede dividir por una fracción igual a cero.");answer=numerator/denominator;formula=`a/b ${op} c/d`;steps=[`Aplicamos la operación ${op} a ambas fracciones.`,`Resultado numérico = ${round(answer)} (${numerator}/${denominator}).`]; }
      else if (kind === "power") { const a=numberValue(values,"a"),b=numberValue(values,"b");answer=a**b;formula="aⁿ";steps=[`Base ${round(a)}, exponente ${round(b)}.`,`${round(a)}^${round(b)} = ${round(answer)}.`]; }
      else if (kind === "root") { const a=numberValue(values,"a"),b=numberValue(values,"b");if(!Number.isInteger(b)||b<2||b>20||a<0&&b%2===0)throw new Error("Revisa el índice y radicando: el índice debe ser de 2 a 20 y las raíces pares requieren radicando no negativo.");answer=Math.sign(a)*Math.abs(a)**(1/b);formula="ⁿ√a";steps=[`Buscamos x cuyo exponente ${round(b)} devuelve ${round(a)}.`,`ⁿ√a = ${round(answer)}.`]; }
      else if (kind === "scientific") { const a=numberValue(values,"a");answer=a;formula="a = m × 10ⁿ";steps=a===0?["El cero en notación científica es 0 × 10⁰."]:[`Movemos la coma para obtener una mantisa entre 1 y 10.`,`${a.toExponential(6)}.`]; }
      else if (kind === "units") { const a=numberValue(values,"a"),from=typeof values.from==="string"?unitMap[values.from]:null,to=typeof values.to==="string"?unitMap[values.to]:null;if(!from||!to||from.family!==to.family)throw new Error("Selecciona dos unidades de la misma magnitud.");answer=a*from.factor/to.factor;formula=`Valor en ${to.name} = valor en ${from.name} × ${from.factor} / ${to.factor}`;steps=[`Convertimos a ${from.family}: ${round(a)} × ${from.factor} = ${round(a*from.factor)}.`,`En ${to.name}: ${round(answer)}.`]; }
      else throw new Error("El cálculo solicitado no está disponible.");
      if(!Number.isFinite(answer))throw new Error("El resultado queda fuera del rango numérico permitido.");
      return Response.json({ result: { formula, steps, answer: kind === "scientific" && answer !== 0 ? answer.toExponential(6) : round(answer) } }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (body.action === "value") { if (!source) throw new Error("Escribe un valor numérico."); return Response.json({ value: expressionValue(source) }, { headers: { "Cache-Control": "private, no-store" } }); }
    return Response.json({ error: "La operación solicitada no es válida." }, { status: 400 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo completar el cálculo." }, { status: 400, headers: { "Cache-Control": "no-store" } }); }
}
