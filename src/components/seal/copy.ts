export type Lang = "ar" | "en";

/**
 * Copy for the home page (The Seal).
 * Rules kept from the project brief: no accreditation, licence, endorsement,
 * testimonial or statistic is claimed. Prices and times are samples and are
 * labelled as such wherever they appear.
 */
const ar = {
  brand: "أكاديمية أمان",
  brandShort: "أمان",
  nav: { courses: "الدورات", how: "كيف تسير", trust: "وضوحنا", companies: "للشركات", cta: "احجز مقعدك", menu: "القائمة", close: "إغلاق", skip: "انتقل إلى المحتوى" },
  hero: {
    eyebrow: "تدريب مباشر في السلامة · المملكة العربية السعودية",
    title: ["معرفةٌ تحمي،", "وثقةٌ للتصرّف"],
    lead: "حصة مباشرة يقدّمها مدرب، يليها اختبار قصير، ثم شهادة إتمام رقمية يمكن لأي جهة التحقق من صحتها.",
  },
  facts: [
    { k: "مباشر", v: "حصة حيّة مع مدرب، وليست مقاطع مسجلة" },
    { k: "بلغتك", v: "بالعربية أو الإنجليزية، ولك أن تسأل" },
    { k: "موثّق", v: "شهادة إتمام برقم فريد ورمز QR" },
  ],
  courses: {
    eyebrow: "الدورات",
    title: "ثلاث دورات، كلٌّ منها حصة واحدة",
    lead: "تدريب معرفي عن بُعد: تتعلم ما يجب فعله ولماذا. المهارات العملية تحتاج تدريباً حضورياً، ونقول ذلك بوضوح.",
    hours: "ساعات",
    sar: "ريال",
    sample: "سعر تجريبي",
    topics: "المحاور",
    more: "تفاصيل الدورة",
    items: [
      { n: "٠١", title: "الإسعافات الأولية", body: "ما تفعله في الدقائق التي تسبق وصول المسعفين.", topics: ["السلامة الشخصية وتقييم الموقع", "المصاب فاقد الاستجابة", "الإصابات", "الحالات المرضية المفاجئة"], hours: "٤", price: "٤٥٠", slug: "first-aid" },
      { n: "٠٢", title: "مكافحة الحرائق", body: "كيف تبدأ النار، وكيف تُمنع، وما أول ما تفعله.", topics: ["كيف تعمل النار", "الوقاية", "الاستجابة الأولى", "الإخلاء"], hours: "٥", price: "٥٥٠", slug: "fire-fighting" },
      { n: "٠٣", title: "القيادة الوقائية", body: "أن ترى الخطر قبل أن يصير حادثاً.", topics: ["عقلية القيادة الوقائية", "المسافة والسرعة", "السائق", "ظروف الطريق"], hours: "٤", price: "٤٠٠", slug: "defensive-driving" },
    ],
  },
  journey: {
    eyebrow: "كيف تسير",
    title: "من الحجز إلى الشهادة في خمس خطوات",
    steps: [
      { n: "١", title: "اختر الموعد", body: "الدورة، والتاريخ، ولغة التدريب التي تناسبك." },
      { n: "٢", title: "احجز مقعدك", body: "أنشئ حسابك وأكّد مقعدك بالريال السعودي." },
      { n: "٣", title: "احضر الحصة", body: "تنضم من لوحتك، ويسجّل المدرب حضورك." },
      { n: "٤", title: "أدِّ الاختبار", body: "يُفتح الاختبار الإلكتروني بعد تأكيد حضورك." },
      { n: "٥", title: "استلم شهادتك", body: "شهادة إتمام تحمل رقماً فريداً ورمز QR." },
    ],
  },
  trust: {
    eyebrow: "وضوحنا",
    title: "ما نعد به، وما لا ندّعيه",
    lead: "الثقة تبدأ من أن نقول لك الحقيقة قبل أن تدفع.",
    yes: "نعم",
    no: "لا",
    items: [
      { title: "مباشر، لا مسجّل", body: "كل حصة يقدّمها مدرب في وقتها، ولك أن تسأل وتناقش." },
      { title: "معرفة، لا مهارة عملية", body: "الدورات عن بُعد تبني المعرفة وتقيّمها. الإنعاش واستخدام الطفاية والقيادة على الطريق تحتاج تدريباً حضورياً." },
      { title: "سجلّ يمكن التحقق منه", body: "رمز QR يؤكد صحة السجل الصادر عن الأكاديمية، ولا يعني اعتماداً من جهة خارجية." },
      { title: "لا اعتماد ندّعيه", body: "لا نذكر ترخيصاً أو اعتماداً إلا بعد صدوره، ومع رقمه." },
    ],
    yesList: ["حصة حيّة مع مدرب", "أسئلتك تُجاب في وقتها", "اختبار بعد الحصة", "سجلّ يتحقق منه أي أحد"],
    noList: ["مقاطع مسجّلة", "مهارات عملية عن بُعد", "اعتماد لم يصدر بعد", "وعود بوظيفة أو قبول"],
    record: { label: "نموذج لسجلّ التحقق", number: "AMN-0000-000000", status: "سارٍ", holder: "اسم حامل الشهادة", course: "اسم الدورة", date: "تاريخ الإصدار" },
  },
  companies: {
    eyebrow: "للشركات",
    title: "مقاعد تشتريها مرة، وتوزّعها حسب جداول فريقك",
    items: ["ادعُ موظفيك بالبريد الإلكتروني دون جداول يدوية", "تابع التسجيل والحضور ونتائج الاختبارات", "نزّل شهادات الموظفين وتقارير التقدّم"],
    cta: "تحدّث إلينا عن فريقك",
  },
  cta: { title: "جاهزون متى كنت جاهزاً", lead: "اختر موعدك، أو تحدّث إلينا عن تدريب فريقك.", primary: "استكشف الدورات", secondary: "درّب فريقك" },
  footer: {
    blurb: "تدريب مباشر في السلامة، بالعربية والإنجليزية.",
    note: "تصميم تجريبي للمعاينة. الأسعار والمواعيد نماذج وليست عروضاً.",
    verify: "تحقق من شهادة",
    contact: "تواصل معنا",
    all: "كل التصاميم",
  },
};

const en: typeof ar = {
  brand: "Aman Academy",
  brandShort: "Aman",
  nav: { courses: "Courses", how: "How it works", trust: "Plain terms", companies: "For companies", cta: "Book a seat", menu: "Menu", close: "Close", skip: "Skip to content" },
  hero: {
    eyebrow: "Live safety training · Saudi Arabia",
    title: ["Knowledge that protects.", "Confidence to act."],
    lead: "A live class with an instructor, a short exam, then a digital certificate of completion that anyone can check is genuine.",
  },
  facts: [
    { k: "Live", v: "A real class with an instructor, never a recording" },
    { k: "Your language", v: "In Arabic or English, with time to ask" },
    { k: "On record", v: "A completion certificate with a unique number and QR code" },
  ],
  courses: {
    eyebrow: "Courses",
    title: "Three courses, one session each",
    lead: "Knowledge-based online training: you learn what to do and why. Hands-on skills need in-person practice, and we say so plainly.",
    hours: "hours",
    sar: "SAR",
    sample: "Sample price",
    topics: "Topics",
    more: "Course details",
    items: [
      { n: "01", title: "First Aid", body: "What to do in the minutes before paramedics arrive.", topics: ["Staying safe and assessing the scene", "The unresponsive casualty", "Injuries", "Sudden illness"], hours: "4", price: "450", slug: "first-aid" },
      { n: "02", title: "Fire Fighting", body: "How fire starts, how it is prevented, and what to do first.", topics: ["How fire works", "Prevention", "First response", "Evacuation"], hours: "5", price: "550", slug: "fire-fighting" },
      { n: "03", title: "Defensive Driving", body: "Seeing the hazard before it becomes a crash.", topics: ["The defensive mindset", "Space and speed", "The driver", "Conditions"], hours: "4", price: "400", slug: "defensive-driving" },
    ],
  },
  journey: {
    eyebrow: "How it works",
    title: "From booking to certificate in five steps",
    steps: [
      { n: "1", title: "Choose a date", body: "The course, the date and the teaching language that suit you." },
      { n: "2", title: "Book your seat", body: "Create an account and confirm your seat in Saudi riyals." },
      { n: "3", title: "Attend the class", body: "Join from your dashboard. The instructor records attendance." },
      { n: "4", title: "Take the exam", body: "The online exam opens once your attendance is confirmed." },
      { n: "5", title: "Receive your certificate", body: "A completion certificate with a unique number and QR code." },
    ],
  },
  trust: {
    eyebrow: "Plain terms",
    title: "What we promise, and what we do not claim",
    lead: "Trust starts with telling you the truth before you pay.",
    yes: "Yes",
    no: "No",
    items: [
      { title: "Live, not recorded", body: "Every session is taught in real time by an instructor, and you can ask and discuss." },
      { title: "Knowledge, not hands-on skill", body: "Online courses build and assess knowledge. CPR, using an extinguisher and on-road driving need in-person practice." },
      { title: "A record you can check", body: "The QR code confirms the record issued by the academy is genuine. It does not imply external accreditation." },
      { title: "No accreditation claimed", body: "We name a licence or accreditation only once it is issued, with its number." },
    ],
    yesList: ["A live class with an instructor", "Your questions answered in real time", "An exam after the class", "A record anyone can verify"],
    noList: ["Pre-recorded videos", "Hands-on skills taught online", "Accreditation not yet issued", "Promises of a job or acceptance"],
    record: { label: "Sample verification record", number: "AMN-0000-000000", status: "Valid", holder: "Holder's name", course: "Course name", date: "Issue date" },
  },
  companies: {
    eyebrow: "For companies",
    title: "Buy seats once, assign them around your team's shifts",
    items: ["Invite employees by email, with no spreadsheets", "See enrolment, attendance and exam results", "Download employee certificates and progress reports"],
    cta: "Talk to us about your team",
  },
  cta: { title: "Ready when you are", lead: "Choose a date, or talk to us about training your team.", primary: "Explore courses", secondary: "Train your team" },
  footer: {
    blurb: "Live safety training, in Arabic and English.",
    note: "Preview design. Prices and dates are samples, not offers.",
    verify: "Verify a certificate",
    contact: "Contact us",
    all: "All designs",
  },
};

export type Copy = typeof ar;
export const copy: Record<Lang, Copy> = { ar, en };
