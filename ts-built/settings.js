"use strict";
let closeBurgerDOM;
let hamburgerDOM;
let mainPageDOM;
let settingsDOM;
class Settings {
    constructor() {
        this.settingList = [];
    }
    getSetting(name) {
        return this.settingList.find((e) => e.name == name);
    }
}
function openSettings() {
    hamburgerDOM.style.display = "none";
    closeBurgerDOM.style.display = "block";
    mainPageDOM.style.display = "none";
    settingsDOM.style.display = "flex";
}
function closeSettings() {
    hamburgerDOM.style.display = "block";
    closeBurgerDOM.style.display = "none";
    mainPageDOM.style.display = "block";
    settingsDOM.style.display = "none";
}
function isSettingsVisible() {
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
function settingsInit() {
    closeBurgerDOM = document.getElementById("closeBurger");
    hamburgerDOM = document.getElementById("openHamburger");
    settingsDOM = document.getElementById("settings");
    mainPageDOM = document.getElementById("mainPage");
}
