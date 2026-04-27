type ResultClass = 'danger' | 'info' | 'success' | 'warn' | 'neutral'

function val(id: string): number {
  return parseFloat((document.getElementById(id) as HTMLInputElement).value)
}

function setRes(pfx: string, cls: ResultClass, hd: string, bd: string): void {
  const r = document.getElementById('res-' + pfx) as HTMLElement
  r.className = 'result on r-' + cls
  ;(document.getElementById('res-' + pfx + '-hd') as HTMLElement).textContent = hd
  ;(document.getElementById('res-' + pfx + '-bd') as HTMLElement).innerHTML = bd
}

function nav(btn: HTMLElement, id: string): void {
  document.querySelectorAll<HTMLElement>('.nav-btn').forEach(b => b.classList.remove('on'))
  document.querySelectorAll<HTMLElement>('.pane').forEach(p => p.classList.remove('on'))
  btn.classList.add('on')
  ;(document.getElementById('p-' + id) as HTMLElement).classList.add('on')
}

function tog(el: HTMLElement): void {
  const was = el.classList.contains('open')
  el.closest('.card')?.querySelectorAll<HTMLElement>('.step').forEach(s => s.classList.remove('open'))
  if (!was) el.classList.add('open')
}

function calcGas(): void {
  const ph = val('g-ph'), pco2 = val('g-pco2'), hco3 = val('g-hco3'), be = val('g-be')
  if (isNaN(ph) || isNaN(pco2) || isNaN(hco3)) { alert('Preencha pH, PaCO₂ e HCO₃⁻'); return }

  const acid = ph < 7.35, alc = ph > 7.45
  const co2h = pco2 > 45, co2l = pco2 < 35
  const h3h = hco3 > 26, h3l = hco3 < 22

  let dist = '', cls: ResultClass = 'success', bd = ''

  if (ph < 7.10 || ph > 7.60) bd = '<span class="badge b-red">pH fatal — risco elevado de morte</span><br><br>'

  if (acid && co2h) {
    dist = 'Acidose respiratória'; cls = 'danger'
    const a = (24 + 0.15 * (pco2 - 40)).toFixed(1)
    const c = (24 + 0.35 * (pco2 - 40)).toFixed(1)
    bd += `pH ${ph} · PaCO₂ ${pco2} mmHg · HCO₃⁻ ${hco3} mEq/L<br>Compensação esperada: <strong>aguda</strong> HCO₃⁻ ≈ ${a} | <strong>crônica</strong> ≈ ${c} mEq/L`
  } else if (acid && h3l) {
    dist = 'Acidose metabólica'; cls = 'danger'
    const w1 = (1.3 * hco3 + 8).toFixed(1), w2 = (1.5 * hco3 + 8).toFixed(1)
    bd += `pH ${ph} · HCO₃⁻ ${hco3} mEq/L<br>PaCO₂ esperado (Winter): <strong>${w1}–${w2} mmHg</strong>`
    if (!isNaN(pco2) && (pco2 < parseFloat(w1) - 2 || pco2 > parseFloat(w2) + 2))
      bd += '<br><span class="badge b-amber">Distúrbio misto — compensação fora do esperado</span>'
  } else if (alc && co2l) {
    dist = 'Alcalose respiratória'; cls = 'info'
    const a = (24 - 0.2 * (40 - pco2)).toFixed(1)
    const c = (24 - 0.5 * (40 - pco2)).toFixed(1)
    bd += `pH ${ph} · PaCO₂ ${pco2} mmHg<br>Compensação esperada: <strong>aguda</strong> HCO₃⁻ ≈ ${a} | <strong>crônica</strong> ≈ ${c} mEq/L`
  } else if (alc && h3h) {
    dist = 'Alcalose metabólica'; cls = 'info'
    const p = (0.7 * (hco3 - 24) + 40).toFixed(1)
    bd += `pH ${ph} · HCO₃⁻ ${hco3} mEq/L<br>PaCO₂ esperado: <strong>≈ ${p} mmHg</strong>`
  } else if (!acid && !alc && (co2h || co2l || h3h || h3l)) {
    dist = 'Distúrbio misto — pH compensado'; cls = 'warn'
    bd += 'pH normal não exclui distúrbio. Avaliar compensação e contexto clínico.'
  } else {
    dist = 'Gasometria dentro dos limites'; cls = 'success'
    bd = 'Todos os parâmetros estão na faixa de referência.'
  }

  if (!isNaN(be)) bd += `<br>BE ${be} mEq/L → ${be < -2 ? 'déficit de base' : be > 2 ? 'excesso de base' : 'normal'}`
  setRes('gas', cls, dist, bd)
}

function calcAG(): void {
  const na = val('ag-na'), cl = val('ag-cl'), hco3 = val('ag-hco3')
  const alb = isNaN(val('ag-alb')) ? 4 : val('ag-alb')
  if (isNaN(na) || isNaN(cl) || isNaN(hco3)) { alert('Preencha Na⁺, Cl⁻ e HCO₃⁻'); return }

  const ag = na - cl - hco3
  const agc = ag + 2.5 * (4 - alb)
  const dag = agc - 10
  const dhco3 = 24 - hco3
  const cls: ResultClass = agc > 12 ? 'danger' : agc < 8 ? 'warn' : 'success'
  const lbl = agc > 12 ? 'AG aumentado' : 'AG normal'

  setRes('ag', cls,
    `${lbl} — AG = ${ag.toFixed(1)} | AG corrigido = ${agc.toFixed(1)} mEq/L`,
    agc > 12 ? 'Presença de ácidos não medidos.<br>Causas: láctico, cetoacidose, uremia, intoxicações.'
      : agc < 8 ? 'AG reduzido — investigar hipoalbuminemia ou paraproteínas.'
      : 'Acidose hiperclorêmica ou sem distúrbio de AG.'
  )

  if (dhco3 > 0) {
    const r = dag / dhco3
    let ri = '', rcls = 'b-gray'
    if (r >= 0.8 && r <= 1.2)   { ri = 'Normal — AG aumentado isolado';     rcls = 'b-green' }
    else if (r < 0.8)            { ri = 'Coexiste acidose hiperclorêmica';    rcls = 'b-amber' }
    else if (r <= 2)             { ri = '+ alcalose metabólica associada';    rcls = 'b-blue'  }
    else                         { ri = 'Possível alcalose láctica / erro';   rcls = 'b-red'   }
    ;(document.getElementById('res-delta') as HTMLElement).innerHTML =
      `ΔAG = ${dag.toFixed(1)} · ΔHCO₃⁻ = ${dhco3.toFixed(1)} · Razão = <strong>${r.toFixed(2)}</strong><br><span class="badge ${rcls}" style="margin-top:4px">${ri}</span>`
  }

  const hco3c = hco3 + dag
  ;(document.getElementById('res-hco3c') as HTMLElement).innerHTML =
    `HCO₃⁻ corrigido = <strong>${hco3c.toFixed(1)} mEq/L</strong> — ` + (
      hco3c >= 22 && hco3c <= 26 ? '<span class="badge b-green">normal — AG isolado</span>'
      : hco3c < 22 ? '<span class="badge b-red">AG + acidose hiperclorêmica</span>'
      : '<span class="badge b-blue">+ alcalose metabólica</span>'
    )
}

function calcKDIGO(): void {
  const b = val('cr-b'), a = val('cr-a'), d = val('cr-d')
  if (isNaN(b) || isNaN(a)) { alert('Preencha creatinina basal e atual'); return }

  const r = a / b, delta = a - b
  let st = 0; let cls: ResultClass = 'success'
  if (r >= 3 || a >= 4)          { st = 3; cls = 'danger' }
  else if (r >= 2)               { st = 2; cls = 'warn'   }
  else if (r >= 1.5 || delta >= 0.3) { st = 1; cls = 'info' }
  else if (!isNaN(d) && d < 0.5) { st = 1; cls = 'info'  }

  const lbls = ['Sem critério para AKI', 'AKI estágio 1 — leve', 'AKI estágio 2 — moderado', 'AKI estágio 3 — grave']
  const bd = `Razão creatinina: <strong>${r.toFixed(2)}×</strong> · Delta: <strong>${delta.toFixed(2)} mg/dL</strong><br>${
    st === 0 ? 'Sem critério KDIGO pelos valores fornecidos.'
    : st === 1 ? 'Monitorizar creatinina, eletrólitos e diurese.'
    : st === 2 ? 'Otimizar perfusão, volume e K⁺. Reavaliar diurese.'
    : 'Avaliar TRS precoce. Aplicar critérios AEIOU.'}`
  setRes('kdigo', cls, lbls[st], bd)
}

function calcAlc(): void {
  const ph = val('al-ph'), hco3 = val('al-hco3'), clur = val('al-clur')
  if (isNaN(ph) || isNaN(hco3)) { alert('Preencha pH e HCO₃⁻'); return }
  if (ph < 7.45 || hco3 < 28) {
    setRes('alc', 'neutral', 'Parâmetros não confirmam alcalose metabólica', 'pH < 7,45 ou HCO₃⁻ < 28 — revisar gasometria.')
    return
  }
  const sev = ph > 7.55 ? 'Grave (pH > 7,55) — tratar ativamente!'
    : ph > 7.50 ? 'Moderada (pH 7,51–7,55)'
    : 'Leve (pH 7,45–7,50)'

  let cond = ''
  if (!isNaN(clur)) {
    if (clur < 20)
      cond = '<strong>Cloro responsivo</strong> (Cl⁻ur &lt; 20 mEq/L)<br>Repor volume (SF 0,9%) · repor cloreto · corrigir K⁺ · suspender causa precipitante'
    else if (clur >= 25)
      cond = '<strong>Cloro resistente</strong> (Cl⁻ur ≥ 25 mEq/L)<br>Suspender diuréticos · acetazolamida · espironolactona se hiperaldosteronismo · corrigir K⁺'
    else
      cond = '<strong>Zona cinza</strong> (Cl⁻ur 20–25 mEq/L)<br>Avaliar contexto clínico e resposta terapêutica'
  }
  setRes('alc', 'info', `Alcalose metabólica — ${sev}`, cond || 'Informe o Cl⁻ urinário para orientar a conduta.')
}

function calcBic(): void {
  const kg = val('b-kg'), hm = val('b-hm'), hd = val('b-hd'), be = val('b-be')
  const pct = val('b-pct')
  if (isNaN(kg)) { alert('Preencha o peso'); return }

  const lines: string[] = []
  if (!isNaN(hm) && !isNaN(hd)) {
    const def = 0.4 * kg * (hd - hm)
    const dose = def * pct
    lines.push(`Fórmula HCO₃⁻: 0,4 × ${kg} × (${hd}−${hm}) = <strong>${def.toFixed(1)} mEq</strong>`)
    lines.push(`Dose (${(pct * 100).toFixed(0)}%): <strong>${dose.toFixed(1)} mEq</strong>`)
    lines.push(`Volume: BIC 4,2% = <strong>${(dose / 0.5).toFixed(1)} mL</strong> · BIC 8,4% = <strong>${dose.toFixed(1)} mL</strong>`)
  }
  if (!isNaN(be) && be < 0) {
    const d1 = (0.3 * kg * Math.abs(be)).toFixed(1)
    const d2 = (0.4 * kg * Math.abs(be)).toFixed(1)
    lines.push(`Fórmula BE: 0,3–0,4 × ${kg} × |${be}| = <strong>${d1}–${d2} mEq</strong>`)
    lines.push(`Dose (${(pct * 100).toFixed(0)}%): <strong>${(0.3 * kg * Math.abs(be) * pct).toFixed(1)}–${(0.4 * kg * Math.abs(be) * pct).toFixed(1)} mEq</strong>`)
  }
  if (!lines.length) { alert('Preencha HCO₃ medido/desejado ou BE'); return }
  lines.push('<br><span style="font-size:11px;opacity:.8">Infundir 50% em 30–60 min · Reavaliar gasometria antes de completar a dose.</span>')
  setRes('bic', 'info', 'Cálculo de dose — bicarbonato de sódio', lines.join('<br>'))
}

// Expõe funções ao escopo global (necessário para onclick inline no HTML)
declare global {
  interface Window {
    nav: typeof nav
    tog: typeof tog
    calcGas: typeof calcGas
    calcAG: typeof calcAG
    calcKDIGO: typeof calcKDIGO
    calcAlc: typeof calcAlc
    calcBic: typeof calcBic
  }
}

window.nav = nav
window.tog = tog
window.calcGas = calcGas
window.calcAG = calcAG
window.calcKDIGO = calcKDIGO
window.calcAlc = calcAlc
window.calcBic = calcBic
