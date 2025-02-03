let closeBurgerDOM: HTMLElement;
let hamburgerDOM: HTMLElement;
let mainPageDOM: HTMLElement;
let settingsDOM: HTMLElement;

interface Setting {
  name: string;
  desc: string;
  choices: Array<any>;
  ticked: boolean;
  value: any | undefined;
}

class Settings {
  settingList: Array<Setting>;
  constructor() {
    this.settingList = [];
  }
  getSetting(name: string): Setting | undefined {
    return this.settingList.find((e) => e.name == name);
  }
}

function openSettings(): void {
  hamburgerDOM.style.display = "none";
  closeBurgerDOM.style.display = "block";

  mainPageDOM.style.display = "none";
  settingsDOM.style.display = "flex";
}
function closeSettings(): void {
  hamburgerDOM.style.display = "block";
  closeBurgerDOM.style.display = "none";

  mainPageDOM.style.display = "block";
  settingsDOM.style.display = "none";
}

function isSettingsVisible(): boolean | null {
  if (!(hamburgerDOM && closeBurgerDOM)) {
    return null;
  }
  let hamburgerStyle = hamburgerDOM.style.display;
  let closeBurgerStyle = closeBurgerDOM.style.display;

  if (hamburgerStyle != "none" && closeBurgerStyle == "none") {
    return false;
  }
  if (hamburgerStyle == "none" && closeBurgerStyle != "none") {
    return true;
  }

  console.error("Found possibly hamburgerStyle == closeBurgerStyle");
  return null; // Something weird happened.
}

function settingsInit(): void {
  closeBurgerDOM = document.getElementById("closeBurger")!;
  hamburgerDOM = document.getElementById("openHamburger")!;
  settingsDOM = document.getElementById("settings")!;
  mainPageDOM = document.getElementById("mainPage")!;
}
