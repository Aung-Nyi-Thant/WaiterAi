import Link from "next/link";
import Icon from "@/modules/platform/Icon";
import DishPhoto from "@/modules/platform/DishPhoto";
import { priceLabel } from "@/modules/diner/i18n";
import type { ShowcaseDish } from "@/modules/platform/showcase";
import MenuPreview, { type PreviewDish } from "./MenuPreview";
import { landingPhotos } from "./photos";
import styles from "./landing.module.css";

type Shop = { id: number; slug: string; name: string; dishes: number; menu: ShowcaseDish[] };
const questions = [
  ["Do diners need an account?", "No. Open a restaurant menu from its table QR code and start browsing. You can explore the menus on this page without signing in."],
  ["Which languages are supported?", "The diner interface supports Thai, Burmese and English. Dish translations come from the restaurant; when a translation is missing, the English name is shown."],
  ["What happens when I send my picks?", "Your picks go to floor staff for confirmation. A waiter accepts the order before it reaches the kitchen. Sending picks does not skip that confirmation."],
  ["Can I ask about food allergies?", "You can share your allergy profile, ask about listed ingredients and call staff. Recipe information may be estimated or missing. Ask the restaurant to confirm ingredients and preparation."],
  ["How does a restaurant get started?", "Create an owner account, add your menu or review an imported menu, check the recipe details, then set up table QR codes and staff access."],
];

function Brand() {
  return <Link href="/" className={styles.brand} aria-label="Shop AI home"><Icon name="utensils" size={24} /><span>Shop AI</span></Link>;
}

export default function Landing({ shops, primary, preview }: { shops: Shop[]; primary?: Shop; preview: PreviewDish[] }) {
  const menuHref = primary ? `/r/${primary.slug}?t=5` : "/register";
  const action = primary ? "Try the menu" : "Create a restaurant";
  const sampleMenus = shops.some(shop => ["golden-lotus", "hachi-kyu"].includes(shop.slug));
  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#main-content">Skip to content</a>
      <header className={styles.header}>
        <Brand />
        <nav className={styles.navigation} aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#our-ai">Our AI</a><a href="#menus">Menus</a><a href="#questions">Questions</a></nav>
        <Link href="/login" className={styles.signIn}>Owner sign in<Icon name="arrowRight" size={18} /></Link>
      </header>
      <main id="main-content">
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroCopy}>
            <h1 id="landing-title"><span>Every table.</span><span>In good hands.</span></h1>
            <p className={styles.heroDescription}>A menu in your language. Answers about your dishes. Your restaurant team, connected from the first question to the final plate.</p>
            <div className={styles.heroActions}><Link href={menuHref} className={styles.primary}>{action}<Icon name="arrowRight" size={20} /></Link><a href="#how-it-works" className={styles.textLink}>See how it works</a></div>
            <div className={styles.languageNote}><div><span lang="th">ไทย</span><span lang="my">မြန်မာ</span><span>English</span></div><p>Good service speaks your language.</p></div>
          </div>
          <div className={styles.heroStage}>
            {primary ? <MenuPreview name={primary.name} slug={primary.slug} dishes={preview} /> : <div className={styles.firstMenu}><Icon name="menu" size={40} /><h2>Your menu starts here</h2><p>Add your first restaurant, then bring its menu to every table.</p><Link href="/register" className={styles.primary}>Create a restaurant<Icon name="arrowRight" size={20} /></Link></div>}
            <p className={styles.stageNote}><Icon name="check" size={17} />{sampleMenus && "Sample menu. "}Diner picks. Staff confirmation. Kitchen preparation.</p>
          </div>
        </section>
        {!!preview.filter(dish => dish.photo_url).length && <section className={styles.foodSection} aria-labelledby="food-title">
          <div><h2 id="food-title">Start with the food</h2><p>Dishes and prices from {primary?.name}{sampleMenus ? "’s sample menu" : ""}. Open a dish to take a closer look.</p></div>
          <div className={styles.foodStrip}>{preview.filter(dish => dish.photo_url).map(dish => <Link key={dish.id} href={`${menuHref}&dish=${dish.id}`} aria-label={`View ${dish.name.en}`}><DishPhoto src={dish.photo_url} /><span>{dish.name.en}</span></Link>)}</div>
        </section>}
        <section className={styles.workflow} id="how-it-works" aria-labelledby="workflow-title">
          <div className={styles.workflowIntro}><h2 id="workflow-title">One table.<br />A whole team.</h2><p>Less back and forth.<br />More time for the people at your table.</p></div>
          <div className={styles.workflowRows}>
            <div><h3>Choose with confidence</h3><p>Browse the menu, ask about a dish and keep your picks together. Share allergy notes or call staff whenever you need a person.</p><Link href={menuHref}>Explore the menu<Icon name="arrowRight" size={18} /></Link></div>
            <div><h3>Keep the floor in the loop</h3><p>Floor staff see table calls and diner picks. They confirm orders before the kitchen starts preparing them.</p><Link href="/staff">Staff sign in<Icon name="arrowRight" size={18} /></Link></div>
            <div><h3>Give the kitchen a clear next step</h3><p>Accepted orders carry the table, dishes and allergy notes. The kitchen updates preparation, and floor staff see what is ready to serve.</p><Link href="/staff">Kitchen sign in<Icon name="arrowRight" size={18} /></Link></div>
          </div>
        </section>
        <section className={styles.aiSection} id="our-ai" aria-labelledby="ai-title">
          <div className={styles.aiIntro}><h2 id="ai-title">Helpful AI.<br />Human judgment.</h2><p>Our team built Shop AI around restaurant data and staff confirmation. Critical information and decisions need more than a language model’s answer.</p></div>
          <div className={styles.aiPrinciples}>
            <div><h3>Restaurant data first</h3><p>When Shop AI recognizes a question about prices, listed allergens or opening hours, it builds the answer directly from the restaurant database.</p></div>
            <div><h3>Checks on AI replies</h3><p>Open-ended questions can use AI, with replies checked against menu data before they are shown. These checks help catch mistakes; they do not guarantee every answer.</p></div>
            <div><h3>People make the critical calls</h3><p>Staff confirm orders before preparation. For allergies, ask the restaurant to confirm ingredients and preparation: saved information may be incomplete or estimated.</p></div>
          </div>
        </section>
        <section className={styles.restaurants} id="menus" aria-labelledby="menus-title">
          <div className={styles.sectionHeading}><h2 id="menus-title">Pull up a chair</h2><p>{sampleMenus ? "Explore the sample restaurant menus." : "Open a menu and explore the diner experience."} No account needed.</p></div>
          {shops.map(shop => <section key={shop.slug} className={styles.restaurant} aria-label={shop.name}>
            <div className={styles.restaurantHeading}><h3>{shop.name}</h3><Link href={`/r/${shop.slug}?t=5`} className={styles.menuAction}>Open the menu · {shop.dishes} {shop.dishes === 1 ? "dish" : "dishes"}<Icon name="arrowRight" size={18} /></Link></div>
            <ul className={styles.dishList} data-ui>{shop.menu.map(dish => <li key={dish.id}><Link href={`/r/${shop.slug}?t=5&dish=${dish.id}`} className={styles.dish}>
              <DishPhoto src={landingPhotos.get(dish.photo_url) || dish.photo_url} /><span className={styles.dishName}><b>{dish.name}</b><small lang={dish.name_th && dish.name_th !== dish.name ? "th" : "en"}>{dish.name_th && dish.name_th !== dish.name ? dish.name_th : dish.category}</small></span><span className={styles.dishPrice}>{priceLabel("en", dish.price)}</span>
            </Link></li>)}</ul>
            {!shop.menu.length && <p className={styles.emptyMenu}>The restaurant is preparing its menu. Check back for available dishes.</p>}
          </section>)}
          {!shops.length && <div className={styles.emptyDirectory}><h3>Make room for your restaurant</h3><p>Your dishes, prices and table links will appear here once your restaurant is set up.</p><Link href="/register" className={styles.primary}>Create a restaurant<Icon name="arrowRight" size={20} /></Link></div>}
        </section>
        <section className={styles.ownerSection} aria-labelledby="owner-title">
          <div><h2 id="owner-title">Your menu.<br />In your hands.</h2><p>Update dishes, availability, hours and answers to common questions. Keep your staff connected with table QR codes and role-based access.</p><Link href="/register" className={styles.primary}>Create a restaurant<Icon name="arrowRight" size={20} /></Link></div>
          <div className={styles.ownerList}><p><Icon name="menu" size={22} />Menu and recipe details</p><p><Icon name="qr" size={22} />QR codes for every table</p><p><Icon name="users" size={22} />Floor and kitchen access</p><p><Icon name="chart" size={22} />Orders and menu insights</p><Link href="/login">Already set up? Sign in<Icon name="arrowRight" size={18} /></Link></div>
        </section>
        <section className={styles.questions} id="questions" aria-labelledby="questions-title">
          <div><h2 id="questions-title">A few things to know</h2><p>From the first scan to staff confirmation.</p></div>
          <div className={styles.questionList}>{questions.map(([question, answer]) => <details key={question} name="landing-questions"><summary>{question}<Icon name="plus" size={20} /></summary><p>{answer}</p></details>)}</div>
        </section>
        <section className={styles.feedback} id="feedback" aria-labelledby="feedback-title">
          <div><h2 id="feedback-title">Help us improve<br />Shop AI.</h2><p>Found something confusing or have an idea? Tell MFU 888 what worked and what we can make better.</p></div>
          <address className={styles.feedbackLinks}>
            <a href="mailto:thantaungnyi@gmail.com?subject=Shop%20AI%20feedback"><span><small>Send feedback by email</small><strong>thantaungnyi@gmail.com</strong></span><Icon name="arrowRight" size={22} /></a>
            <a href="https://github.com/Aung-Nyi-Thant"><span><small>Connect on GitHub</small><strong>Aung-Nyi-Thant</strong></span><Icon name="arrowRight" size={22} /></a>
          </address>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerTop}><p>Shop AI · Built by MFU 888</p><nav aria-label="Footer navigation"><a href="#menus">Menus</a><Link href="/login">Owner</Link><Link href="/staff">Staff & kitchen</Link><Link href="/register">Create a restaurant</Link></nav></div>
        <div className={styles.footerBottom}><span>Thai, Burmese & English</span>{preview.some(dish => dish.photo_url.startsWith("/landing/")) && <a href="/landing/provenance.json">Menu photo references: HaChi Kyu / Wongnai</a>}</div>
      </footer>
    </div>
  );
}
