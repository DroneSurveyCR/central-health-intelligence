/**
 * Lightweight, dependency-free i18n dictionary for HealthSync.
 *
 * Patient-facing copy for Casa Elev8 (Costa Rica), serving English and
 * Spanish speakers. No runtime deps — just a typed record + a `t()` helper.
 *
 * To add a new string: add a key to DICT with both `en` and `es`.
 * Spanish is written in a natural, patient-friendly register (usted form),
 * not machine-literal.
 */

export type Lang = "en" | "es";

export const LANGS: readonly Lang[] = ["en", "es"] as const;

export type Dict = Record<string, { en: string; es: string }>;

export const DICT: Dict = {
  // ---- nav items ----
  today: { en: "Today", es: "Hoy" },
  home: { en: "Home", es: "Inicio" },
  intake: { en: "Intake", es: "Admisión" },
  plan: { en: "My Plan", es: "Mi plan" },
  progress: { en: "Progress", es: "Progreso" },
  results: { en: "Results", es: "Resultados" },
  body: { en: "3D Body", es: "Cuerpo 3D" },
  book: { en: "Book", es: "Reservar" },
  appointments: { en: "Appointments", es: "Citas" },
  agreements: { en: "Agreements", es: "Acuerdos" },
  learn: { en: "Learn", es: "Aprender" },
  store: { en: "Store", es: "Tienda" },
  orders: { en: "Orders", es: "Pedidos" },
  memberships: { en: "Memberships", es: "Membresías" },
  billing: { en: "Billing", es: "Facturación" },
  about: { en: "About", es: "Acerca de" },
  privacy: { en: "Privacy", es: "Privacidad" },
  more: { en: "More", es: "Más" },
  messages: { en: "Messages", es: "Mensajes" },

  // ---- common UI ----
  welcome: { en: "Welcome", es: "Bienvenido" },
  save: { en: "Save", es: "Guardar" },
  saving: { en: "Saving…", es: "Guardando…" },
  saved: { en: "Saved", es: "Guardado" },
  cancel: { en: "Cancel", es: "Cancelar" },
  loading: { en: "Loading…", es: "Cargando…" },
  submit: { en: "Submit", es: "Enviar" },
  continue: { en: "Continue", es: "Continuar" },
  back: { en: "Back", es: "Atrás" },
  next: { en: "Next", es: "Siguiente" },
  close: { en: "Close", es: "Cerrar" },
  edit: { en: "Edit", es: "Editar" },
  delete: { en: "Delete", es: "Eliminar" },
  confirm: { en: "Confirm", es: "Confirmar" },
  search: { en: "Search", es: "Buscar" },
  sign_in: { en: "Sign in", es: "Iniciar sesión" },
  sign_out: { en: "Sign out", es: "Cerrar sesión" },
  email: { en: "Email", es: "Correo electrónico" },
  password: { en: "Password", es: "Contraseña" },
  language: { en: "Language", es: "Idioma" },
  error_generic: {
    en: "Something went wrong. Please try again.",
    es: "Algo salió mal. Inténtelo de nuevo.",
  },
  required: { en: "Required", es: "Obligatorio" },
  optional: { en: "Optional", es: "Opcional" },
  yes: { en: "Yes", es: "Sí" },
  no: { en: "No", es: "No" },

  // ---- patient home copy ----
  home_subtitle: {
    en: "Your results, plan, and appointments will live here. To get started, complete your intake.",
    es: "Sus resultados, plan y citas estarán aquí. Para comenzar, complete su admisión.",
  },
  start_intake: { en: "Start my intake", es: "Comenzar mi admisión" },

  // ---- patient home dashboard ----
  home_welcome_back: { en: "Welcome back", es: "Bienvenido de nuevo" },
  home_of: { en: "of", es: "de" },
  home_your_program: { en: "Your program", es: "Su programa" },
  home_program_day: { en: "Day", es: "Día" },
  home_view_all: { en: "View all", es: "Ver todo" },
  home_book: { en: "Book", es: "Reservar" },
  home_open_today: { en: "Open today", es: "Abrir hoy" },
  home_explore: { en: "Explore", es: "Explorar" },
  home_tile_labs: { en: "Your results", es: "Sus resultados" },
  home_tile_plan: { en: "Phases & items", es: "Fases y elementos" },
  home_tile_messages: { en: "Clinic thread", es: "Hilo con la clínica" },
  home_tile_body: { en: "Explore in 3D", es: "Explorar en 3D" },
  home_tile_report: { en: "Your progress", es: "Su progreso" },
  home_dashboard_subtitle: {
    en: "Here's a snapshot of your care — tap any card to dive in.",
    es: "Aquí tiene un resumen de su cuidado — toque cualquier tarjeta para ver más.",
  },
  home_card_open: { en: "Open", es: "Abrir" },
  home_card_appointment: { en: "Next appointment", es: "Próxima cita" },
  home_no_appointment: { en: "No upcoming visit · Book one", es: "Sin visitas próximas · Reserve una" },
  home_appt_type_consult: { en: "Consultation", es: "Consulta" },
  home_appt_type_followup: { en: "Follow-up", es: "Seguimiento" },
  home_appt_type_scan: { en: "Scan", es: "Escaneo" },
  home_card_plan: { en: "Your 90-day plan", es: "Su plan de 90 días" },
  home_plan_complete: { en: "% complete", es: "% completado" },
  home_card_today: { en: "Today", es: "Hoy" },
  home_tasks_of: { en: "of", es: "de" },
  home_tasks_done: { en: "tasks done today", es: "tareas completadas hoy" },
  home_card_labs: { en: "Latest labs", es: "Últimos laboratorios" },
  home_card_messages: { en: "Messages", es: "Mensajes" },
  home_unread_one: { en: "new message", es: "mensaje nuevo" },
  home_unread_many: { en: "new messages", es: "mensajes nuevos" },
  home_messages_tap: { en: "Tap to read", es: "Toque para leer" },
  home_no_messages: { en: "No new messages", es: "Sin mensajes nuevos" },
  home_card_scan: { en: "Latest scan", es: "Último escaneo" },
  home_scan_view: { en: "View your 3D body", es: "Ver su cuerpo 3D" },

  // ---- level labels (plan / today) ----
  level_supplement: { en: "Supplements", es: "Suplementos" },
  level_modality: { en: "Modalities", es: "Modalidades" },
  level_habit: { en: "Habits", es: "Hábitos" },
  level_measurement: { en: "Measurements", es: "Mediciones" },

  // ---- today page ----
  today_label: { en: "Today", es: "Hoy" },
  today_greeting: {
    en: "Good to see you",
    es: "Qué gusto verle",
  },
  today_focus_intro: {
    en: "Here's your focus for",
    es: "Este es su enfoque para",
  },
  today_focus_tagline: {
    en: "One small step at a time.",
    es: "Un pequeño paso a la vez.",
  },
  today_fresh_day: {
    en: "A fresh day to check in with yourself.",
    es: "Un nuevo día para conectarse consigo mismo.",
  },
  today_no_plan: {
    en: "Once your plan is active, your daily checklist will live here. Dr. Randi will build a personalized 90-day path just for you.",
    es: "Cuando su plan esté activo, su lista diaria estará aquí. La Dra. Randi le creará un camino personalizado de 90 días, solo para usted.",
  },
  today_checklist: { en: "Today's checklist", es: "Lista de hoy" },
  today_done_suffix: { en: "done", es: "completado" },
  today_all_done: {
    en: "All done for today",
    es: "Todo listo por hoy",
  },
  today_all_done_tail: {
    en: "— beautifully done. 🌿",
    es: "— excelente trabajo. 🌿",
  },
  today_no_items: {
    en: "No checklist items for today yet. Your daily steps will appear here as soon as your current phase begins.",
    es: "Aún no hay tareas para hoy. Sus pasos diarios aparecerán aquí en cuanto comience su fase actual.",
  },
  today_feeling_title: {
    en: "How are you feeling?",
    es: "¿Cómo se siente?",
  },
  today_feeling_hint: {
    en: "On a scale of 1 (rough) to 10 (great), where are you today?",
    es: "En una escala del 1 (difícil) al 10 (excelente), ¿cómo está hoy?",
  },
  today_feeling_placeholder: {
    en: "Anything you'd like Dr. Randi to know? (optional)",
    es: "¿Algo que le gustaría que la Dra. Randi sepa? (opcional)",
  },
  today_feeling_save: {
    en: "Save how I feel",
    es: "Guardar cómo me siento",
  },
  today_feeling_logged: {
    en: "Logged · thank you",
    es: "Registrado · gracias",
  },
  today_vital_title: { en: "Log a vital", es: "Registrar un signo vital" },
  today_vital_hint: {
    en: "Blood pressure (mmHg). Skip it if you don't have a reading today.",
    es: "Presión arterial (mmHg). Omítalo si hoy no tiene una lectura.",
  },
  today_vital_save: { en: "Save vital", es: "Guardar signo vital" },
  today_vital_logged: { en: "Logged", es: "Registrado" },
  today_vital_enter_both: {
    en: "Please enter both numbers.",
    es: "Por favor ingrese ambos números.",
  },
  today_vital_save_error: {
    en: "Couldn't save that — please try again.",
    es: "No se pudo guardar — inténtelo de nuevo.",
  },

  // ---- plan page ----
  plan_title_default: { en: "My 90-Day Plan", es: "Mi plan de 90 días" },
  plan_empty: {
    en: "Your plan will appear here after your first visit. Dr. Randi will build a personalized 90-day path just for you.",
    es: "Su plan aparecerá aquí después de su primera visita. La Dra. Randi le creará un camino personalizado de 90 días, solo para usted.",
  },
  plan_progress_pre: { en: "You're", es: "Va por el" },
  plan_progress_post: {
    en: "% of the way through. Keep going",
    es: "% del camino. Siga adelante",
  },
  plan_progress_tail: {
    en: "— every step counts.",
    es: "— cada paso cuenta.",
  },
  plan_youre_in_phase: { en: "You're in Phase", es: "Está en la fase" },
  plan_phase_word: { en: "Phase", es: "Fase" },
  plan_todays_focus: { en: "Today's focus", es: "Enfoque de hoy" },
  plan_phase_empty: {
    en: "Nothing scheduled for this phase yet — check back soon.",
    es: "Aún no hay nada programado para esta fase — vuelva pronto.",
  },
  plan_ready_pre: {
    en: "Your plan is ready and waiting. It begins on",
    es: "Su plan está listo y esperando. Comienza el",
  },
  plan_your_start_date: {
    en: "your start date",
    es: "su fecha de inicio",
  },
  plan_full_plan: { en: "Your full plan", es: "Su plan completo" },
  plan_current_badge: { en: "Current", es: "Actual" },
  plan_no_items: { en: "No items yet.", es: "Aún no hay elementos." },

  // ---- store page ----
  store_title: { en: "Store", es: "Tienda" },
  store_intro_pre: {
    en: "Practitioner-grade supplements, hand-picked for your plan",
    es: "Suplementos de grado profesional, elegidos para su plan",
  },
  store_intro_post: {
    en: ". Add what you need and place your order — Dr. Randi's team will take it from there.",
    es: ". Agregue lo que necesite y haga su pedido — el equipo de la Dra. Randi se encargará del resto.",
  },
  store_no_products: {
    en: "No products available just yet. Please check back soon.",
    es: "Aún no hay productos disponibles. Por favor vuelva pronto.",
  },
  store_your_order: { en: "Your order", es: "Su pedido" },
  store_cart_empty: {
    en: "Your cart is empty. Add a supplement to get started.",
    es: "Su carrito está vacío. Agregue un suplemento para comenzar.",
  },
  store_order_placed: {
    en: "Order placed — thank you! Dr. Randi's team will be in touch.",
    es: "Pedido realizado — ¡gracias! El equipo de la Dra. Randi se pondrá en contacto.",
  },
  store_subtotal: { en: "Subtotal", es: "Subtotal" },
  store_remove: { en: "Remove", es: "Quitar" },
  store_add: { en: "Add", es: "Agregar" },
  store_place_order: { en: "Place order", es: "Hacer pedido" },
  store_placing: { en: "Placing…", es: "Procesando…" },
  store_order_error: {
    en: "Could not place your order — please try again.",
    es: "No se pudo realizar su pedido — inténtelo de nuevo.",
  },

  // ---- common extra ----
  back_to_home: { en: "Back to home", es: "Volver al inicio" },
  total: { en: "Total", es: "Total" },
  subtotal: { en: "Subtotal", es: "Subtotal" },

  // ---- results page ----
  results_title: { en: "Your results", es: "Sus resultados" },
  results_signin: {
    en: "Please sign in to view your results.",
    es: "Inicie sesión para ver sus resultados.",
  },
  results_empty: {
    en: "You don't have any scan results yet. After your next visit, your results and a friendly walkthrough will appear here.",
    es: "Aún no tiene resultados de escaneos. Después de su próxima visita, sus resultados y una explicación amigable aparecerán aquí.",
  },
  results_from_pre: { en: "From your", es: "De su" },
  results_from_post: {
    en: "This is a friendly overview — your practitioner will walk you through the details together.",
    es: "Este es un resumen amigable — su profesional revisará los detalles con usted.",
  },
  results_from_on: { en: "on", es: "el" },
  results_plain_title: {
    en: "What this means, in plain terms",
    es: "Qué significa esto, en palabras sencillas",
  },
  results_plain_clear: {
    en: "Nothing stood out that needs special attention right now. That's a great place to be — keep up the good habits.",
    es: "Nada resaltó que necesite atención especial en este momento. Ese es un excelente lugar para estar — siga con los buenos hábitos.",
  },
  results_plain_flagged_pre: { en: "We highlighted", es: "Resaltamos" },
  results_plain_flagged_area: { en: "area", es: "área" },
  results_plain_flagged_areas: { en: "areas", es: "áreas" },
  results_plain_flagged_post: {
    en: "on the body map below. Most of this is simply information to help guide your plan — colours show how much focus each area deserves, from a gentle nudge (amber) to a priority (red). None of this is cause for alarm; it's a roadmap for feeling your best.",
    es: "en el mapa corporal de abajo. La mayoría es simplemente información para guiar su plan — los colores muestran cuánta atención merece cada área, desde un recordatorio suave (ámbar) hasta una prioridad (rojo). Nada de esto es motivo de alarma; es una guía para que se sienta lo mejor posible.",
  },
  results_general: { en: "General", es: "General" },
  results_severity_mild: {
    en: "something gentle to keep an eye on",
    es: "algo leve para vigilar",
  },
  results_severity_moderate: {
    en: "an area worth a little focused attention",
    es: "un área que merece un poco de atención",
  },
  results_severity_high: {
    en: "an area your care team is prioritising",
    es: "un área que su equipo de cuidado está priorizando",
  },
  results_severity_noted: { en: "noted", es: "anotado" },
  results_bodymap_title: { en: "Your body map", es: "Su mapa corporal" },
  results_bodymap_hint: {
    en: "Tap any highlighted area to read more about it.",
    es: "Toque cualquier área resaltada para leer más sobre ella.",
  },

  // ---- progress page ----
  progress_title: { en: "Your progress", es: "Su progreso" },
  progress_intro_pre: {
    en: "Every check-in builds the picture. Here's how things are trending",
    es: "Cada registro construye el panorama. Así van las tendencias",
  },
  progress_empty: {
    en: "No logs yet — this is where your story takes shape. Each time you note how you feel or record a vital, your trends will appear here.",
    es: "Aún no hay registros — aquí es donde toma forma su historia. Cada vez que anote cómo se siente o registre un signo vital, sus tendencias aparecerán aquí.",
  },
  progress_feeling_title: {
    en: "How you've been feeling",
    es: "Cómo se ha sentido",
  },
  progress_feeling_hint_pre: {
    en: "Self-rated 1–10 over the last",
    es: "Autoevaluado del 1 al 10 durante los últimos",
  },
  progress_days: { en: "days", es: "días" },
  progress_feeling_ylabel: { en: "Feeling (1–10)", es: "Ánimo (1–10)" },
  progress_feeling_empty: {
    en: "Log a quick “how I feel” and your trend starts here.",
    es: "Registre rápidamente “cómo me siento” y su tendencia comienza aquí.",
  },
  progress_bp_title: { en: "Blood pressure", es: "Presión arterial" },
  progress_bp_hint: {
    en: "Systolic and diastolic readings over time.",
    es: "Lecturas sistólica y diastólica a lo largo del tiempo.",
  },
  progress_bp_systolic: { en: "Systolic", es: "Sistólica" },
  progress_bp_diastolic: { en: "Diastolic", es: "Diastólica" },
  progress_bp_empty: {
    en: "No readings recorded yet.",
    es: "Aún no hay lecturas registradas.",
  },
  progress_adherence_title: { en: "Plan adherence", es: "Cumplimiento del plan" },
  progress_adherence_hint_pre: {
    en: "Share of your daily plan completed, last",
    es: "Porcentaje de su plan diario completado, últimos",
  },
  progress_adherence_empty: {
    en: "Once your plan is active, your daily completion will show up here.",
    es: "Cuando su plan esté activo, su cumplimiento diario aparecerá aquí.",
  },

  // ---- orders page ----
  orders_title: { en: "Orders", es: "Pedidos" },
  orders_subtitle: {
    en: "Your supplement order history.",
    es: "Su historial de pedidos de suplementos.",
  },
  orders_empty: {
    en: "You haven't placed any orders yet. Visit the Store to get started.",
    es: "Aún no ha realizado ningún pedido. Visite la Tienda para comenzar.",
  },
  orders_date_pending: { en: "Date pending", es: "Fecha pendiente" },
  orders_item: { en: "item", es: "artículo" },
  orders_items: { en: "items", es: "artículos" },
  orders_item_fallback: { en: "Item", es: "Artículo" },
  order_status_pending: { en: "pending", es: "pendiente" },
  order_status_paid: { en: "paid", es: "pagado" },
  order_status_fulfilled: { en: "fulfilled", es: "completado" },
  order_status_completed: { en: "completed", es: "completado" },
  order_status_cancelled: { en: "cancelled", es: "cancelado" },

  // ---- billing page ----
  billing_title: { en: "Billing", es: "Facturación" },
  billing_receipt_doc: { en: "Receipt", es: "Recibo" },
  billing_invoice_doc: { en: "Invoice", es: "Factura" },
  billing_bill_to: { en: "Billed to", es: "Facturado a" },
  billing_print: { en: "Print / save PDF", es: "Imprimir / guardar PDF" },
  billing_thanks: { en: "Thank you for your visit.", es: "Gracias por su visita." },
  billing_view: { en: "View & print", es: "Ver e imprimir" },
  billing_pay: { en: "Pay with card", es: "Pagar con tarjeta" },
  orders_empty_title: { en: "No orders yet", es: "Aún no hay pedidos" },
  orders_browse_store: { en: "Browse the store", es: "Explorar la tienda" },
  billing_subtitle: {
    en: "Your payment history and receipts.",
    es: "Su historial de pagos y recibos.",
  },
  billing_empty: {
    en: "You don't have any payments on file yet.",
    es: "Aún no tiene pagos registrados.",
  },
  billing_total_paid: { en: "Total paid", es: "Total pagado" },
  billing_receipt: { en: "Receipt", es: "Recibo" },
  billing_invoices: { en: "Invoices", es: "Facturas" },
  billing_payments: { en: "Payments", es: "Pagos" },
  billing_outstanding: { en: "Outstanding balance", es: "Saldo pendiente" },
  billing_no_invoices: {
    en: "You don't have any invoices yet.",
    es: "Aún no tiene facturas.",
  },
  billing_subtotal: { en: "Subtotal", es: "Subtotal" },
  billing_discount: { en: "Discount", es: "Descuento" },
  billing_total: { en: "Total", es: "Total" },
  billing_amount_due: { en: "Amount due", es: "Importe a pagar" },
  billing_paid_with: { en: "Paid with", es: "Pagado con" },
  billing_receipt_issued: { en: "Receipt issued", es: "Recibo emitido" },
  billing_invoice_no: { en: "Invoice", es: "Factura" },
  billing_qty: { en: "Qty", es: "Cant." },

  // ---- memberships page ----
  memberships_title: { en: "Memberships", es: "Membresías" },
  memberships_intro_pre: {
    en: "Recurring care for lasting results",
    es: "Cuidado recurrente para resultados duraderos",
  },
  memberships_intro_post: {
    en: ". Choose a plan and Dr. Randi's team will help you get set up — no payment required to request.",
    es: ". Elija un plan y el equipo de la Dra. Randi le ayudará a comenzar — no se requiere pago para solicitar.",
  },
  memberships_footer: {
    en: "Memberships are billed monthly and can be paused or cancelled anytime. Final pricing is confirmed during your onboarding call.",
    es: "Las membresías se cobran mensualmente y pueden pausarse o cancelarse en cualquier momento. El precio final se confirma durante su llamada de bienvenida.",
  },
  memberships_most_popular: { en: "Most popular", es: "Más popular" },
  memberships_per_month: { en: "/mo", es: "/mes" },
  membership_request_sent: {
    en: "Request sent — Dr. Randi's team will reach out.",
    es: "Solicitud enviada — el equipo de la Dra. Randi se pondrá en contacto.",
  },
  membership_sending: { en: "Sending…", es: "Enviando…" },
  membership_request: { en: "Request", es: "Solicitar" },

  // ---- appointments page ----
  appointments_title: { en: "Appointments", es: "Citas" },
  appointments_book_new: { en: "Book new", es: "Reservar nueva" },
  appointments_empty: {
    en: "No appointments yet — book your first visit when you're ready.",
    es: "Aún no hay citas — reserve su primera visita cuando esté listo.",
  },
  appointments_online: { en: "Online", es: "En línea" },
  appointments_in_person: { en: "In person", es: "Presencial" },
  appointments_ical_title: {
    en: "Add to your phone calendar",
    es: "Agregar al calendario de su teléfono",
  },
  appointments_ical_hint: {
    en: "Subscribe once and your appointments auto-update with native reminders.",
    es: "Suscríbase una vez y sus citas se actualizan automáticamente con recordatorios nativos.",
  },
  appt_status_scheduled: { en: "scheduled", es: "programada" },
  appt_status_confirmed: { en: "confirmed", es: "confirmada" },
  appt_status_completed: { en: "completed", es: "completada" },
  appt_status_cancelled: { en: "cancelled", es: "cancelada" },
  appt_status_pending: { en: "pending", es: "pendiente" },

  // ---- agreements page ----
  agreements_title: { en: "Consent agreements", es: "Acuerdos de consentimiento" },
  agreements_subtitle: {
    en: "Please review and sign each agreement below.",
    es: "Por favor revise y firme cada acuerdo a continuación.",
  },
  agreements_signed: { en: "Signed", es: "Firmado" },
  agreements_not_signed: { en: "Not signed", es: "Sin firmar" },
  agreements_signed_on: { en: "Signed on", es: "Firmado el" },
  sig_hint: {
    en: "Sign below with your mouse or finger.",
    es: "Firme abajo con el mouse o el dedo.",
  },
  sig_need_ink: {
    en: "Please draw your signature before agreeing.",
    es: "Por favor dibuje su firma antes de aceptar.",
  },
  sig_save_error: {
    en: "Could not save — please try again.",
    es: "No se pudo guardar — inténtelo de nuevo.",
  },
  sig_clear: { en: "Clear", es: "Borrar" },
  sig_agree: { en: "I agree & sign", es: "Acepto y firmo" },

  // ---- learn page ----
  learn_hub: { en: "Education Hub", es: "Centro educativo" },
  learn_title: { en: "Learn", es: "Aprender" },
  learn_subtitle: {
    en: "Plain-language guides to the scans, protocols, and therapies behind your care — read at your own pace, whenever you're curious.",
    es: "Guías en lenguaje sencillo sobre los escaneos, protocolos y terapias detrás de su cuidado — léalas a su propio ritmo, cuando tenga curiosidad.",
  },
  learn_empty: {
    en: "New articles are on the way. Check back soon.",
    es: "Nuevos artículos están en camino. Vuelva pronto.",
  },
  learn_more: { en: "More", es: "Más" },
  learn_min_read: { en: "min read", es: "min de lectura" },
  learn_back: { en: "← Back to Learn", es: "← Volver a Aprender" },
  learn_not_found: { en: "Article not found", es: "Artículo no encontrado" },
  learn_not_found_body: {
    en: "This article may have moved or isn't published yet. Browse the hub for what's available.",
    es: "Este artículo puede haberse movido o aún no está publicado. Explore el centro para ver lo disponible.",
  },
  learn_no_content: {
    en: "This article doesn't have content yet.",
    es: "Este artículo aún no tiene contenido.",
  },

  // ---- about page ----
  about_practice_fallback: { en: "Our practice", es: "Nuestra práctica" },
  about_team: { en: "Our team", es: "Nuestro equipo" },
  about_services: { en: "Services", es: "Servicios" },

  // ---- privacy page ----
  privacy_title: { en: "Your data & privacy", es: "Sus datos y privacidad" },
  privacy_subtitle: {
    en: "You own your data. Download a full copy anytime, or ask us to delete your account.",
    es: "Usted es dueño de sus datos. Descargue una copia completa cuando quiera, o pídanos eliminar su cuenta.",
  },
  privacy_download: { en: "Download my data", es: "Descargar mis datos" },
  privacy_hint: {
    en: "Deletion removes your access immediately; records are permanently erased after the legal retention window.",
    es: "La eliminación quita su acceso de inmediato; los registros se borran permanentemente después del período legal de retención.",
  },

  // ---- messages (patient ↔ care team) ----
  messages_title: { en: "Messages", es: "Mensajes" },
  messages_subtitle: {
    en: "Message your care team",
    es: "Escriba a su equipo de atención",
  },
  messages_placeholder: {
    en: "Write a message…",
    es: "Escriba un mensaje…",
  },
  messages_send: { en: "Send", es: "Enviar" },
  messages_sending: { en: "Sending…", es: "Enviando…" },
  messages_empty: {
    en: "No messages yet. Start the conversation with your care team below.",
    es: "Aún no hay mensajes. Inicie la conversación con su equipo de atención abajo.",
  },
  messages_send_error: {
    en: "Could not send — please try again.",
    es: "No se pudo enviar — inténtelo de nuevo.",
  },
  messages_sender_you: { en: "You", es: "Usted" },
  messages_sender_team: { en: "Care team", es: "Equipo de atención" },

  // ---- labs / biomarker trending ----
  labs: { en: "Labs", es: "Laboratorios" },
  labs_title: { en: "Your lab markers", es: "Sus marcadores de laboratorio" },
  labs_intro: {
    en: "We track your biomarkers against optimal ranges — where you truly thrive, not just where you avoid disease.",
    es: "Seguimos sus biomarcadores frente a rangos óptimos — donde realmente florece, no solo donde evita la enfermedad.",
  },
  labs_empty: {
    en: "No lab results yet. Once your care team adds bloodwork, your markers and trends will appear here.",
    es: "Aún no hay resultados de laboratorio. Cuando su equipo agregue análisis, sus marcadores y tendencias aparecerán aquí.",
  },
  labs_status_optimal: { en: "Optimal", es: "Óptimo" },
  labs_status_below: { en: "Below optimal", es: "Por debajo del óptimo" },
  labs_status_above: { en: "Above optimal", es: "Por encima del óptimo" },
  labs_optimal_range: { en: "Optimal range", es: "Rango óptimo" },
  labs_trend_improving: { en: "improving", es: "mejorando" },
  labs_trend_worsening: { en: "worsening", es: "empeorando" },
  labs_trend_flat: { en: "holding steady", es: "estable" },
  labs_previous: { en: "Previous", es: "Anterior" },
  labs_no_previous: {
    en: "First reading — no trend yet.",
    es: "Primera medición — aún sin tendencia.",
  },
  labs_back_to_record: { en: "Back to record", es: "Volver al expediente" },
  labs_add_title: { en: "Add a lab result", es: "Agregar un resultado" },
  labs_field_marker: { en: "Marker", es: "Marcador" },
  labs_field_value: { en: "Value", es: "Valor" },
  labs_field_unit: { en: "Unit", es: "Unidad" },
  labs_field_optimal_low: { en: "Optimal low", es: "Óptimo bajo" },
  labs_field_optimal_high: { en: "Optimal high", es: "Óptimo alto" },
  labs_field_category: { en: "Category", es: "Categoría" },
  labs_field_collected_on: { en: "Collected on", es: "Fecha de toma" },
  labs_save: { en: "Save result", es: "Guardar resultado" },
  labs_saving: { en: "Saving…", es: "Guardando…" },
  labs_save_error: {
    en: "Could not save — please try again.",
    es: "No se pudo guardar — inténtelo de nuevo.",
  },
  labs_validation: {
    en: "Marker and a numeric value are required.",
    es: "Se requieren el marcador y un valor numérico.",
  },

  // ---- progress report ----
  report: { en: "Progress report", es: "Informe de progreso" },
  report_hero_title: {
    en: "Your 90-day progress",
    es: "Su progreso de 90 días",
  },
  report_hero_sub: {
    en: "Look how far you've come.",
    es: "Mire cuánto ha avanzado.",
  },
  report_print: { en: "Print / Save as PDF", es: "Imprimir / Guardar PDF" },
  report_for: { en: "Prepared for", es: "Preparado para" },
  report_age: { en: "Age", es: "Edad" },
  report_generated: { en: "Generated", es: "Generado" },
  report_empty: {
    en: "Your progress report will appear here once we have a little history to show. Check back after your first follow-up.",
    es: "Su informe de progreso aparecerá aquí cuando tengamos algo de historial que mostrar. Vuelva después de su primer seguimiento.",
  },

  // journey / plan
  report_journey_title: { en: "The journey", es: "El recorrido" },
  report_journey_phase: { en: "Current phase", es: "Fase actual" },
  report_journey_progress: { en: "Plan progress", es: "Progreso del plan" },
  report_journey_none: {
    en: "No active plan yet — your journey starts with your first care plan.",
    es: "Aún no hay un plan activo — su recorrido comienza con su primer plan de cuidado.",
  },

  // labs baseline → now
  report_labs_title: { en: "Labs: baseline → now", es: "Análisis: inicio → ahora" },
  report_labs_intro: {
    en: "Where your key markers started, and where they are today.",
    es: "Dónde empezaron sus marcadores clave y dónde están hoy.",
  },
  report_labs_empty: {
    en: "No lab results on file yet.",
    es: "Aún no hay resultados de laboratorio.",
  },
  report_baseline: { en: "Baseline", es: "Inicio" },
  report_now: { en: "Now", es: "Ahora" },
  report_optimal: { en: "Optimal", es: "Óptimo" },
  report_single_reading: {
    en: "First reading — we'll track change from here.",
    es: "Primera medición — seguiremos el cambio desde aquí.",
  },
  report_trend_improving: { en: "Improving", es: "Mejorando" },
  report_trend_worsening: { en: "Needs attention", es: "Requiere atención" },
  report_trend_flat: { en: "Holding steady", es: "Estable" },
  report_status_optimal: { en: "In optimal range", es: "En rango óptimo" },
  report_status_below: { en: "Below optimal", es: "Bajo el óptimo" },
  report_status_above: { en: "Above optimal", es: "Sobre el óptimo" },

  // body scan
  report_scan_title: { en: "Body scan", es: "Escaneo corporal" },
  report_scan_before: { en: "Before", es: "Antes" },
  report_scan_after: { en: "After", es: "Después" },
  report_scan_systems: { en: "Top systems flagged", es: "Sistemas destacados" },
  report_scan_none_flagged: {
    en: "No systems flagged — clear scan.",
    es: "Ningún sistema marcado — escaneo limpio.",
  },
  report_scan_current: { en: "Current findings", es: "Hallazgos actuales" },
  report_scan_clear: {
    en: "Your latest scan came back clear — nothing flagged.",
    es: "Su escaneo más reciente salió limpio — nada marcado.",
  },
  report_scan_empty: {
    en: "No body scans on file yet.",
    es: "Aún no hay escaneos corporales.",
  },

  // wellbeing
  report_wellbeing_title: { en: "How you've felt", es: "Cómo se ha sentido" },
  report_feel_then: { en: "Felt then", es: "Antes" },
  report_feel_now: { en: "Feeling now", es: "Ahora" },
  report_feel_scale: { en: "self-rated 1–10", es: "auto-evaluado 1–10" },
  report_adherence: { en: "Plan adherence", es: "Adherencia al plan" },
  report_adherence_sub: {
    en: "of your daily plan completed",
    es: "de su plan diario completado",
  },
  report_wellbeing_empty: {
    en: "No wellbeing check-ins recorded yet.",
    es: "Aún no hay registros de bienestar.",
  },

  // plan items
  report_plan_title: { en: "Your plan", es: "Su plan" },
  report_plan_empty: {
    en: "No plan items to show yet.",
    es: "Aún no hay elementos del plan.",
  },
  report_level_supplement: { en: "Supplements", es: "Suplementos" },
  report_level_modality: { en: "Modalities", es: "Modalidades" },
  report_level_habit: { en: "Habits", es: "Hábitos" },
  report_level_measurement: { en: "Measurements", es: "Mediciones" },

  report_back_to_record: { en: "Back to record", es: "Volver al expediente" },
};

/**
 * Translate a key for a given language.
 * Fallback order: requested lang -> English -> the key itself.
 */
export function t(key: string, lang: Lang): string {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[lang] ?? entry.en ?? key;
}
