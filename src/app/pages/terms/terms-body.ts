import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-terms-body',
  standalone: true,
  imports: [],
  template: `
    <div class="terms-shell">

      <div class="terms-hero">
        <span class="badge">Plataforma de Recargas</span>
        <h1>Términos y Condiciones <span class="highlight">de Uso</span></h1>
        <p class="hero-sub">NeoCharge · Última actualización: 2026</p>
      </div>

      <div class="terms-grid">

        <div class="term-card">
          <div class="term-num">01</div>
          <div class="term-body">
            <h2>Introducción</h2>
            <p>El presente documento establece los Términos y Condiciones que regulan el acceso y uso de la plataforma de recargas desarrollada por el equipo de NeoCharge. El uso de la plataforma implica la aceptación plena y sin reservas de estos Términos y Condiciones.</p>
          </div>
        </div>

        <div class="term-card">
          <div class="term-num">02</div>
          <div class="term-body">
            <h2>Naturaleza del Servicio</h2>
            <ul>
              <li>El Desarrollador provee únicamente la infraestructura tecnológica que facilita las operaciones de recarga.</li>
              <li>No es proveedor directo de los servicios recargados ni responsable de la relación comercial entre el usuario y los proveedores finales.</li>
              <li>La plataforma funciona como intermediario técnico, no como entidad financiera ni distribuidor oficial.</li>
            </ul>
          </div>
        </div>

        <div class="term-card">
          <div class="term-num">03</div>
          <div class="term-body">
            <h2>Alcance Internacional</h2>
            <ul>
              <li>Disponible para usuarios de cualquier país.</li>
              <li>El usuario debe verificar la legalidad en su jurisdicción.</li>
              <li>No se garantiza cumplimiento con regulaciones específicas de cada territorio.</li>
            </ul>
          </div>
        </div>

        <div class="term-card">
          <div class="term-num">04</div>
          <div class="term-body">
            <h2>Registro y Acceso</h2>
            <ul>
              <li>El usuario debe proporcionar información veraz y actualizada.</li>
              <li>Es responsable de la confidencialidad de sus credenciales.</li>
              <li>No se responsabiliza por accesos no autorizados derivados de negligencia.</li>
            </ul>
          </div>
        </div>

        <div class="term-card">
          <div class="term-num">05</div>
          <div class="term-body">
            <h2>Pagos y Procesamiento</h2>
            <ul>
              <li>Los pagos se realizan mediante pasarelas externas.</li>
              <li>El Desarrollador no gestiona ni almacena fondos directamente.</li>
              <li>Las disputas deben resolverse con la pasarela o proveedor correspondiente.</li>
            </ul>
          </div>
        </div>

        <div class="term-card">
          <div class="term-num">06</div>
          <div class="term-body">
            <h2>Confirmación de Recargas</h2>
            <ul>
              <li>La recarga se ejecutará en un plazo razonable tras el pago.</li>
              <li>El usuario recibirá notificación de confirmación.</li>
              <li>No se responsabiliza por errores en datos ingresados por el usuario.</li>
            </ul>
          </div>
        </div>

        <div class="term-card">
          <div class="term-num">07</div>
          <div class="term-body">
            <h2>Limitaciones de Responsabilidad</h2>
            <ul>
              <li>No se responsabiliza por pérdidas económicas o daños indirectos.</li>
              <li>No se hace responsable de fraudes o usos indebidos.</li>
              <li>No asume responsabilidad por la calidad o disponibilidad de servicios recargados.</li>
            </ul>
          </div>
        </div>

        <div class="term-card">
          <div class="term-num">08</div>
          <div class="term-body">
            <h2>Reembolsos</h2>
            <ul>
              <li>Solo aplican en fallos atribuibles al sistema.</li>
              <li>No se realizan por errores del usuario.</li>
              <li>El Desarrollador evaluará cada caso individualmente.</li>
            </ul>
          </div>
        </div>

        <div class="term-card">
          <div class="term-num">09</div>
          <div class="term-body">
            <h2>Uso Legal y Prohibiciones</h2>
            <ul>
              <li>Utilizar la plataforma únicamente para fines legales.</li>
              <li>No realizar actividades fraudulentas o ilícitas.</li>
              <li>No manipular ni vulnerar la seguridad del sistema.</li>
            </ul>
          </div>
        </div>

        <div class="term-card">
          <div class="term-num">10</div>
          <div class="term-body">
            <h2>Privacidad y Protección de Datos</h2>
            <ul>
              <li>Se recopilan datos mínimos necesarios para el funcionamiento.</li>
              <li>No se comparten datos con terceros salvo obligación legal.</li>
              <li>El tratamiento de datos se ajusta a la legislación vigente.</li>
            </ul>
          </div>
        </div>

        <div class="term-card">
          <div class="term-num">11</div>
          <div class="term-body">
            <h2>Propiedad Intelectual</h2>
            <ul>
              <li>El software, diseño y logotipos son propiedad exclusiva del Desarrollador.</li>
              <li>Prohibida la reproducción, distribución o modificación sin autorización.</li>
            </ul>
          </div>
        </div>

        <div class="term-card">
          <div class="term-num">12</div>
          <div class="term-body">
            <h2>Modificaciones</h2>
            <p>El Desarrollador podrá modificar estos Términos en cualquier momento. El uso continuado de la plataforma implica la aceptación de las nuevas condiciones.</p>
          </div>
        </div>

        <div class="term-card">
          <div class="term-num">13</div>
          <div class="term-body">
            <h2>Jurisdicción y Ley Aplicable</h2>
            <p>El usuario reconoce que es responsable de cumplir con las leyes de su país de residencia al utilizar la plataforma.</p>
          </div>
        </div>

      </div>

      <footer class="terms-footer">
        <p><strong>© 2026 NeoCharge</strong> – Todos los derechos reservados.</p>
      </footer>

    </div>
  `,
  styles: [`
    :host { display: block; }

    .terms-shell {
      max-width: 900px;
      margin: 0 auto;
      padding: 0 20px 60px;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    /* Hero */
    .terms-hero {
      text-align: center;
      padding: 52px 20px 40px;
      border-bottom: 1px solid rgba(0, 212, 255, 0.12);
      margin-bottom: 40px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 212, 255, 0.08);
      border: 1px solid rgba(0, 212, 255, 0.28);
      padding: 5px 16px;
      border-radius: 100px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #00d4ff;
      margin-bottom: 22px;
    }
    .badge::before {
      content: '';
      width: 7px; height: 7px;
      background: #00d4ff;
      border-radius: 50%;
      box-shadow: 0 0 8px #00d4ff;
      animation: blink 2s infinite;
    }
    @keyframes blink {
      0%,100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    h1 {
      font-family: 'Orbitron', sans-serif;
      font-size: clamp(1.5rem, 3.5vw, 2.4rem);
      font-weight: 900;
      color: #ffffff;
      margin: 0 0 10px;
      line-height: 1.2;
    }
    h1 .highlight {
      background: linear-gradient(135deg, #00d4ff, #9d00ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .hero-sub {
      color: #6a7a99;
      font-size: 0.9rem;
    }

    /* Grid */
    .terms-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .term-card {
      display: flex;
      gap: 20px;
      background: #0f0f1e;
      border: 1px solid rgba(0, 212, 255, 0.12);
      border-radius: 14px;
      padding: 24px 28px;
      transition: border-color 0.25s ease, box-shadow 0.25s ease;
    }
    .term-card:hover {
      border-color: rgba(0, 212, 255, 0.3);
      box-shadow: 0 4px 24px rgba(0, 212, 255, 0.05);
    }

    .term-num {
      flex-shrink: 0;
      width: 36px; height: 36px;
      background: linear-gradient(135deg, #00d4ff, #9d00ff);
      color: #000;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.72rem;
      font-weight: 900;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .term-body h2 {
      color: #ffffff;
      font-size: 1rem;
      font-weight: 700;
      margin: 0 0 12px;
    }

    .term-body p {
      color: #a0aec0;
      line-height: 1.8;
      margin: 0;
    }

    .term-body ul {
      list-style: none;
      padding: 0; margin: 0;
      display: flex;
      flex-direction: column;
      gap: 9px;
    }
    .term-body ul li {
      color: #a0aec0;
      padding-left: 18px;
      position: relative;
      line-height: 1.7;
    }
    .term-body ul li::before {
      content: '›';
      position: absolute;
      left: 0;
      color: #00d4ff;
      font-weight: 900;
      font-size: 1.1rem;
      line-height: 1.5;
    }

    /* Footer */
    .terms-footer {
      text-align: center;
      margin-top: 48px;
      padding-top: 28px;
      border-top: 1px solid rgba(0, 212, 255, 0.1);
      color: #4a5568;
      font-size: 0.85rem;
    }
    .terms-footer strong { color: #00d4ff; }

    @media (max-width: 600px) {
      .term-card { padding: 18px 16px; gap: 14px; }
      .term-num { width: 30px; height: 30px; font-size: 0.65rem; }
    }
  `]
})
export class TermsBodyComponent {}
