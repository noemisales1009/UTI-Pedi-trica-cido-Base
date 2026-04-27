export {}

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
  const h3h  = hco3 > 26, h3l  = hco3 < 22

  let dist = '', cls: ResultClass = 'success', bd = ''

  // FIX 5 — Validação Henderson-Hasselbalch
  // pH calculado = 6,1 + log([HCO₃⁻] / (0,03 × PaCO₂))
  const pHcalc = 6.1 + Math.log10(hco3 / (0.03 * pco2))
  if (Math.abs(ph - pHcalc) > 0.03) {
    bd += `<span class="badge b-amber">pH medido (${ph}) ≠ pH calculado H-H (${pHcalc.toFixed(2)}) — verificar coleta ou erro analítico</span><br><br>`
  }

  if (ph < 7.10 || ph > 7.60) bd += '<span class="badge b-red">pH fatal — risco elevado de morte</span><br><br>'

  // ── FIX 4 — Detecção via compensação esperada ─────────
  if (acid) {
    if (co2h) {
      // Acidose respiratória primária: compensação esperada eleva o HCO₃⁻
      const hco3ExpAcute   = 24 + 0.1  * (pco2 - 40)   // aguda: +1 mEq / 10 mmHg
      const hco3ExpChronic = 24 + 0.35 * (pco2 - 40)   // crônica: +3,5 mEq / 10 mmHg

      if (hco3 < hco3ExpAcute - 2) {
        // HCO₃⁻ abaixo do esperado mesmo para acidose aguda → acidose metabólica concomitante
        dist = 'Distúrbio misto — acidose respiratória + metabólica'; cls = 'danger'
        bd += `PaCO₂ ${pco2} mmHg (↑) · HCO₃⁻ ${hco3} mEq/L<br>`
        bd += `HCO₃⁻ esperado (aguda ≥ ${hco3ExpAcute.toFixed(1)}): observado abaixo — acidose metabólica concomitante<br>`
        bd += '<span class="badge b-red">Distúrbio misto grave</span>'
      } else if (hco3 > hco3ExpChronic + 2) {
        // HCO₃⁻ acima do esperado mesmo para crônica → alcalose metabólica concomitante
        dist = 'Distúrbio misto — acidose resp. + alcalose metab.'; cls = 'warn'
        bd += `PaCO₂ ${pco2} mmHg (↑) · HCO₃⁻ ${hco3} mEq/L<br>`
        bd += `HCO₃⁻ esperado (crônica ≤ ${hco3ExpChronic.toFixed(1)}): observado acima — alcalose metabólica concomitante`
      } else {
        dist = 'Acidose respiratória'; cls = 'danger'
        bd += `pH ${ph} · PaCO₂ ${pco2} mmHg · HCO₃⁻ ${hco3} mEq/L<br>`
        bd += `Compensação esperada: <strong>aguda</strong> HCO₃⁻ ≈ ${hco3ExpAcute.toFixed(1)} | <strong>crônica</strong> ≈ ${hco3ExpChronic.toFixed(1)} mEq/L`
      }

    } else if (h3l) {
      // Acidose metabólica primária — FIX 2: Winter = 1,5 × HCO₃⁻ + 8 ± 2 (ATS)
      const pco2Exp = 1.5 * hco3 + 8
      const pco2Min = pco2Exp - 2, pco2Max = pco2Exp + 2

      if (pco2 > pco2Max) {
        dist = 'Distúrbio misto — acidose metabólica + respiratória'; cls = 'danger'
        bd += `HCO₃⁻ ${hco3} mEq/L · PaCO₂ ${pco2} mmHg<br>`
        bd += `PaCO₂ esperado (Winter): ${pco2Min.toFixed(1)}–${pco2Max.toFixed(1)} mmHg — observado acima → acidose resp. concomitante<br>`
        bd += '<span class="badge b-red">Distúrbio misto grave</span>'
      } else if (pco2 < pco2Min) {
        dist = 'Distúrbio misto — acidose metab. + alcalose resp.'; cls = 'warn'
        bd += `HCO₃⁻ ${hco3} mEq/L · PaCO₂ ${pco2} mmHg<br>`
        bd += `PaCO₂ esperado (Winter): ${pco2Min.toFixed(1)}–${pco2Max.toFixed(1)} mmHg — observado abaixo → alcalose resp. concomitante`
      } else {
        dist = 'Acidose metabólica'; cls = 'danger'
        bd += `pH ${ph} · HCO₃⁻ ${hco3} mEq/L<br>`
        bd += `PaCO₂ esperado (Winter ATS): <strong>${pco2Min.toFixed(1)}–${pco2Max.toFixed(1)} mmHg</strong>`
      }

    } else {
      dist = 'Acidose — avaliar parâmetros'; cls = 'warn'
      bd += 'pH acidótico sem padrão claro. Verificar valores e contexto clínico.'
    }

  } else if (alc) {
    if (co2l) {
      // Alcalose respiratória primária: compensação esperada reduz o HCO₃⁻
      const hco3ExpAcute   = 24 - 0.2 * (40 - pco2)   // aguda: -2 mEq / 10 mmHg
      const hco3ExpChronic = 24 - 0.5 * (40 - pco2)   // crônica: -5 mEq / 10 mmHg

      if (hco3 < hco3ExpChronic - 2) {
        dist = 'Distúrbio misto — alcalose resp. + acidose metab.'; cls = 'warn'
        bd += `PaCO₂ ${pco2} mmHg (↓) · HCO₃⁻ ${hco3} mEq/L<br>`
        bd += `HCO₃⁻ esperado (crônica ≥ ${hco3ExpChronic.toFixed(1)}): observado abaixo — acidose metabólica concomitante`
      } else if (hco3 > hco3ExpAcute + 2) {
        dist = 'Distúrbio misto — alcalose resp. + metabólica'; cls = 'warn'
        bd += `PaCO₂ ${pco2} mmHg (↓) · HCO₃⁻ ${hco3} mEq/L<br>`
        bd += `HCO₃⁻ esperado (aguda ≤ ${hco3ExpAcute.toFixed(1)}): observado acima — alcalose metabólica concomitante`
      } else {
        dist = 'Alcalose respiratória'; cls = 'info'
        bd += `pH ${ph} · PaCO₂ ${pco2} mmHg<br>`
        bd += `Compensação esperada: <strong>aguda</strong> HCO₃⁻ ≈ ${hco3ExpAcute.toFixed(1)} | <strong>crônica</strong> ≈ ${hco3ExpChronic.toFixed(1)} mEq/L`
      }

    } else if (h3h) {
      // Alcalose metabólica primária — FIX 3: coef 0,6 + teto 55 mmHg (Merck)
      const pco2Exp = Math.min(0.6 * (hco3 - 24) + 40, 55)
      const tol = 4   // tolerância ±4 mmHg

      if (pco2 < pco2Exp - tol) {
        dist = 'Distúrbio misto — alcalose metab. + resp.'; cls = 'warn'
        bd += `HCO₃⁻ ${hco3} mEq/L · PaCO₂ ${pco2} mmHg<br>`
        bd += `PaCO₂ esperado: ≈ ${pco2Exp.toFixed(1)} mmHg${pco2Exp >= 55 ? ' (teto 55)' : ''} — observado abaixo → alcalose resp. concomitante`
      } else if (pco2 > pco2Exp + tol) {
        dist = 'Distúrbio misto — alcalose metab. + acidose resp.'; cls = 'warn'
        bd += `HCO₃⁻ ${hco3} mEq/L · PaCO₂ ${pco2} mmHg<br>`
        bd += `PaCO₂ esperado: ≈ ${pco2Exp.toFixed(1)} mmHg${pco2Exp >= 55 ? ' (teto 55)' : ''} — observado acima → acidose resp. concomitante`
      } else {
        dist = 'Alcalose metabólica'; cls = 'info'
        bd += `pH ${ph} · HCO₃⁻ ${hco3} mEq/L<br>`
        bd += `PaCO₂ esperado: <strong>≈ ${pco2Exp.toFixed(1)} mmHg</strong>${pco2Exp >= 55 ? ' <span class="badge b-amber">teto 55 mmHg atingido</span>' : ''}`
      }

    } else {
      dist = 'Alcalose — avaliar parâmetros'; cls = 'warn'
      bd += 'pH alcalótico sem padrão claro. Verificar valores e contexto clínico.'
    }

  } else {
    // pH normal — distúrbios opostos com pH compensado
    if (co2h && h3h) {
      dist = 'Distúrbio misto — acidose resp. + alcalose metab. (pH compensado)'; cls = 'warn'
      bd += 'pH normal mascara dois distúrbios opostos. Ex: DPOC + vômitos.'
    } else if (co2l && h3l) {
      dist = 'Distúrbio misto — alcalose resp. + acidose metab. (pH compensado)'; cls = 'warn'
      bd += 'pH normal mascara dois distúrbios opostos. Ex: sepse + diarreia.'
    } else if (co2h || co2l || h3h || h3l) {
      dist = 'Parâmetro isolado alterado — pH compensado'; cls = 'neutral'
      bd += 'Avaliar compensação e contexto clínico.'
    } else {
      dist = 'Gasometria dentro dos limites'; cls = 'success'
      bd = 'Todos os parâmetros estão na faixa de referência.'
    }
  }

  if (!isNaN(be)) bd += `<br>BE ${be} mEq/L → ${be < -2 ? 'déficit de base' : be > 2 ? 'excesso de base' : 'normal'}`
  setRes('gas', cls, dist, bd)
}

function calcAG(): void {
  const na = val('ag-na'), cl = val('ag-cl'), hco3 = val('ag-hco3')
  const alb = isNaN(val('ag-alb')) ? 4 : val('ag-alb')
  if (isNaN(na) || isNaN(cl) || isNaN(hco3)) { alert('Preencha Na⁺, Cl⁻ e HCO₃⁻'); return }

  const ag   = na - cl - hco3
  const agc  = ag + 2.5 * (4 - alb)
  // FIX 1 — referência 12 (protocolo de bolso / premium)
  const dag  = agc - 12
  const dhco3 = 24 - hco3
  const cls: ResultClass = agc > 12 ? 'danger' : agc < 8 ? 'warn' : 'success'
  const lbl  = agc > 12 ? 'AG aumentado' : 'AG normal'

  setRes('ag', cls,
    `${lbl} — AG = ${ag.toFixed(1)} | AG corrigido = ${agc.toFixed(1)} mEq/L`,
    agc > 12 ? 'Presença de ácidos não medidos.<br>Causas: láctico, cetoacidose, uremia, intoxicações.'
      : agc < 8 ? 'AG reduzido — investigar hipoalbuminemia ou paraproteínas.'
      : 'Acidose hiperclorêmica ou sem distúrbio de AG.'
  )

  if (dhco3 > 0 && agc > 12) {
    const r = dag / dhco3
    let ri = '', rcls = 'b-gray'
    if (r >= 0.8 && r <= 1.2)   { ri = 'Normal — AG aumentado isolado';   rcls = 'b-green' }
    else if (r < 0.8)            { ri = 'Coexiste acidose hiperclorêmica'; rcls = 'b-amber' }
    else if (r <= 2)             { ri = '+ alcalose metabólica associada'; rcls = 'b-blue'  }
    else                         { ri = 'Possível alcalose láctica / erro'; rcls = 'b-red'  }
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
  const b = val('cr-b'), a = val('cr-a'), d = val('cr-d'), dt = val('cr-dt')
  if (isNaN(b) || isNaN(a)) { alert('Preencha creatinina basal e atual'); return }

  const r = a / b, delta = a - b
  let stCr = 0, stDi = 0
  let cls: ResultClass = 'success'

  if (r >= 3 || a >= 4)              stCr = 3
  else if (r >= 2)                   stCr = 2
  else if (r >= 1.5 || delta >= 0.3) stCr = 1

  if (!isNaN(d) && !isNaN(dt) && dt > 0) {
    if      (d < 0.3 && dt >= 24) stDi = 3
    else if (d < 0.5 && dt >= 12) stDi = 2
    else if (d < 0.5 && dt >= 6)  stDi = 1
  } else if (!isNaN(d) && d < 0.5) {
    stDi = 1
  }

  const st = Math.max(stCr, stDi)
  if (st === 3) cls = 'danger'
  else if (st === 2) cls = 'warn'
  else if (st === 1) cls = 'info'

  const lbls = ['Sem critério para AKI', 'AKI estágio 1 — leve', 'AKI estágio 2 — moderado', 'AKI estágio 3 — grave']
  let bd = `Razão creatinina: <strong>${r.toFixed(2)}×</strong> · Delta: <strong>${delta.toFixed(2)} mg/dL</strong>`
  if (!isNaN(d)) {
    bd += ` · Diurese: <strong>${d} mL/kg/h</strong>`
    if (!isNaN(dt) && dt > 0) bd += ` por <strong>${dt}h</strong>`
  }
  if (stCr > 0 && stDi > 0 && stCr !== stDi)
    bd += `<br><span class="badge b-amber">Creatinina → estágio ${stCr} · Diurese → estágio ${stDi} · Prevalece o maior</span>`
  bd += '<br>' + (
    st === 0 ? 'Sem critério KDIGO pelos valores fornecidos.'
    : st === 1 ? 'Monitorizar creatinina, eletrólitos e diurese de perto.'
    : st === 2 ? 'Otimizar perfusão renal, volume e K⁺. Reavaliar diurese.'
    : 'Avaliar TRS precoce. Aplicar critérios AEIOU.'
  )
  setRes('kdigo', cls, lbls[st], bd)
}

function calcAlc(): void {
  const ph = val('al-ph'), hco3 = val('al-hco3'), clur = val('al-clur')
  if (isNaN(ph) || isNaN(hco3)) { alert('Preencha pH e HCO₃⁻'); return }
  if (ph < 7.45 || hco3 < 28) {
    setRes('alc', 'neutral', 'Parâmetros não confirmam alcalose metabólica', 'pH < 7,45 ou HCO₃⁻ < 28 — revisar gasometria.')
    return
  }
  const pco2Exp = Math.min(0.6 * (hco3 - 24) + 40, 55)
  const teto = pco2Exp >= 55
  const sev = ph > 7.55 ? 'Grave (pH > 7,55)' : ph > 7.50 ? 'Moderada (pH 7,51–7,55)' : 'Leve (pH 7,45–7,50)'
  const sevBadge = ph > 7.55
    ? '<span class="badge b-red">Grave — tratar ativamente!</span>'
    : ph > 7.50 ? '<span class="badge b-amber">Moderada</span>'
    : '<span class="badge b-green">Leve</span>'
  let bd = `${sevBadge} &nbsp;PaCO₂ esperada (Merck): <strong>≈ ${pco2Exp.toFixed(1)} mmHg</strong>`
  if (teto) bd += ' <span class="badge b-amber">teto 55 mmHg</span>'
  bd += '<br><br>'
  if (!isNaN(clur)) {
    if (clur < 20) {
      bd += '<strong>Cloro responsivo</strong> (Cl⁻ur &lt; 20 mEq/L)<br>'
      bd += '• SF 0,9% — repor volume e cloreto<br>'
      bd += '• Repor K⁺ (hipocalemia perpetua a alcalose)<br>'
      bd += '• Suspender causa precipitante (vômitos, SNG, diuréticos)<br>'
      bd += '• Meta Cl⁻ur: &gt; 40 mEq/L'
    } else if (clur >= 25) {
      bd += '<strong>Cloro resistente</strong> (Cl⁻ur ≥ 25 mEq/L)<br>'
      bd += '• Acetazolamida 5–10 mg/kg/dose IV/VO 6–8h (máx 500 mg)<br>'
      bd += '• Espironolactona 1–3 mg/kg/dia se hiperaldosteronismo<br>'
      bd += '• Corrigir K⁺ e Mg²⁺ antes de tratar a alcalose<br>'
      bd += '• HCl 0,1 N se pH &gt; 7,60 refratário (via CVC)'
    } else {
      bd += '<strong>Zona cinza</strong> (Cl⁻ur 20–25 mEq/L)<br>Avaliar contexto clínico e resposta terapêutica'
    }
  } else {
    bd += 'Informe o Cl⁻ urinário para orientar a conduta.'
  }
  bd += '<br><br><strong>Complicações:</strong> '
  bd += '<span class="badge b-amber">Hipocalemia</span> '
  bd += '<span class="badge b-amber">↓Ca²⁺ ionizado</span> '
  bd += '<span class="badge b-red">Arritmias</span> '
  bd += '<span class="badge b-red">Tetania/convulsões</span> '
  bd += '<span class="badge b-gray">↓ entrega O₂ (Bohr)</span>'
  setRes('alc', 'info', `Alcalose metabólica — ${sev}`, bd)
}

function calcBic(): void {
  const kg = val('b-kg'), hm = val('b-hm'), hd = val('b-hd'), be = val('b-be')
  const pct = val('b-pct'), vd = val('b-vd')
  if (isNaN(kg)) { alert('Preencha o peso'); return }

  const lines: string[] = []
  if (!isNaN(hm) && !isNaN(hd)) {
    const def  = vd * kg * (hd - hm)
    const dose = def * pct
    lines.push(`Fórmula HCO₃⁻: ${vd} × ${kg} × (${hd}−${hm}) = <strong>${def.toFixed(1)} mEq</strong>`)
    lines.push(`Dose (${(pct * 100).toFixed(0)}%): <strong>${dose.toFixed(1)} mEq</strong>`)
    lines.push(`Volume: BIC 4,2% = <strong>${(dose / 0.5).toFixed(1)} mL</strong> · BIC 8,4% = <strong>${dose.toFixed(1)} mL</strong>`)
  }
  if (!isNaN(be) && be < 0) {
    const def2  = vd * kg * Math.abs(be)
    const dose2 = def2 * pct
    lines.push(`Fórmula BE: ${vd} × ${kg} × |${be}| = <strong>${def2.toFixed(1)} mEq</strong>`)
    lines.push(`Dose (${(pct * 100).toFixed(0)}%): <strong>${dose2.toFixed(1)} mEq</strong>`)
  }
  if (!lines.length) { alert('Preencha HCO₃ medido/desejado ou BE'); return }
  lines.push('<br><span style="font-size:11px;opacity:.8">Infundir 50% em 30–60 min · Reavaliar gasometria antes de completar a dose.</span>')
  setRes('bic', 'info', 'Cálculo de dose — bicarbonato de sódio', lines.join('<br>'))
}

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

window.nav      = nav
window.tog      = tog
window.calcGas  = calcGas
window.calcAG   = calcAG
window.calcKDIGO = calcKDIGO
window.calcAlc  = calcAlc
window.calcBic  = calcBic
