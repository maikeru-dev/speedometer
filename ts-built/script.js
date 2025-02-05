"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const SPEEDLIMIT_API_URL = "https://devweb2024.cis.strath.ac.uk/aes02112-nodejs/speed";
let speedDOM; // Can't const declare without init :(
let streetDOM;
let unitDOM;
let closeBurgerDOM;
let hamburgerDOM;
let speedLimitTextDOM;
let speedLimitSignDOM;
let mainPageDOM;
let settingsDOM;
let lastKnownLocalUnit = null;
let blinkList = [];
let blinkId = blink();
const defaultSettings = Object.freeze({
    units: "setting_MPH",
    bgColour: "#000000",
    speedColour: "#FFFFFF",
    unitColour: "#FFFFFF",
    streetColour: "#FFFFFF",
    bgImage: null,
    slLocation: "rightSpeedSign",
});
let currentSettings = fastClone(defaultSettings);
function blink() {
    // This is a synchronized blink animation
    const timeout = 1000;
    return setInterval(() => {
        setTimeout(() => {
            blinkList.forEach((element) => {
                element.style.visibility = "hidden";
            });
        }, timeout / 2);
        setTimeout(() => {
            blinkList.forEach((element) => {
                element.style.visibility = "visible";
            });
        }, timeout);
    }, timeout);
}
function registerBlink(key) {
    if (blinkList.indexOf(key) == -1) {
        blinkList.push(key);
    }
}
function unregisterBlink(key) {
    let i = blinkList.indexOf(key);
    if (i == -1)
        return;
    blinkList.splice(i, 1);
    key.style.visibility = "visible";
}
function isSettingsCustom() {
    return localStorage.getItem("customSettings") != null;
}
function saveSettings(settings) {
    var _a;
    if (currentSettings == defaultSettings) {
        console.log("wtf");
    }
    var inputElements = document.getElementsByClassName("settingUnits");
    var unitSelected = Array.prototype.filter.call(inputElements, (element) => {
        return element.checked == true;
    });
    inputElements = document.getElementsByClassName("settingSignLocation");
    var locationSelected = Array.prototype.filter.call(inputElements, (element) => {
        return element.checked == true;
    });
    if (unitSelected.length != 1 || locationSelected.length != 1) {
        console.log("Something has gone horribly wrong", unitSelected, locationSelected);
    }
    settings.slLocation = locationSelected[0].id;
    settings.units = unitSelected[0].id;
    settings.bgColour = document.getElementById("bgColour").value;
    settings.speedColour = document.getElementById("speedColour").value;
    settings.unitColour = document.getElementById("unitColour").value;
    settings.streetColour = document.getElementById("streetColour").value;
    var fileUpload = document.getElementById("fileUpload");
    if (((_a = fileUpload.files) === null || _a === void 0 ? void 0 : _a.length) == 1) {
        const reader = new FileReader();
        let base64File;
        reader.onloadend = () => {
            base64File = reader.result;
            settings.bgImage = "bgImage";
            localStorage.setItem(settings.bgImage, base64File.toString());
            // WARN: This is an exception, this will update the bg right away due to being async!
            document.body.style.backgroundImage = `url(${base64File})`;
        };
        reader.readAsDataURL(fileUpload.files[0]);
    }
}
function writeSettings(settings) {
    document.getElementById(settings.units).checked = true;
    document.getElementById(settings.slLocation).checked =
        true;
    document.getElementById("speedColour").value =
        settings.speedColour;
    document.getElementById("streetColour").value =
        settings.streetColour;
    document.getElementById("bgColour").value =
        settings.bgColour;
    document.getElementById("unitColour").value =
        settings.unitColour;
    if (settings.bgImage) {
        //(document.getElementById("fileUpload") as HTMLInputElement).files = new FileList.new(); localStorage.getItem(settings.bgImage)!;
        //window.atob(settings.bgImage); forget this
    }
}
function fastClone(a) {
    return JSON.parse(JSON.stringify(a));
}
function openSettings() {
    // Load settings
    if (!isSettingsCustom()) {
        // write to DOM
        writeSettings(currentSettings);
    }
    // Update styles
    hamburgerDOM.style.display = "none";
    hamburgerDOM.style.pointerEvents = "none";
    closeBurgerDOM.style.display = "block";
    setTimeout(() => {
        // This is a subtle fix for buttons positioned on top of each other.
        closeBurgerDOM.style.pointerEvents = "auto";
    }, 20);
    mainPageDOM.style.display = "none";
    settingsDOM.style.display = "flex";
}
function closeSettings() {
    // save from DOM
    let newSettings = {};
    saveSettings(newSettings);
    if (!settingsDeepEqual(currentSettings, newSettings)) {
        localStorage.setItem("customSettings", "somevalue");
        currentSettings = newSettings;
        applySettings(newSettings);
    }
    closeBurgerDOM.style.display = "none";
    closeBurgerDOM.style.pointerEvents = "none";
    hamburgerDOM.style.display = "block";
    setTimeout(() => {
        // This is a subtle fix for buttons positioned on top of each other.
        hamburgerDOM.style.pointerEvents = "auto";
    }, 20);
    mainPageDOM.style.display = "block";
    settingsDOM.style.display = "none";
}
function resetSettings() {
    currentSettings = fastClone(defaultSettings);
    localStorage.clear();
    applySettings(defaultSettings);
    clearBGImage();
    writeSettings(defaultSettings);
}
function clearBGImage() {
    localStorage.removeItem("bgImage");
    document.body.style.backgroundImage = "";
    document.getElementById("fileUpload").value = "";
    currentSettings.bgImage = null;
}
// Pure styling, functional aspects found where they are needed.
function applySettings(settings) {
    streetDOM.style.color = settings.streetColour;
    speedDOM.style.color = settings.speedColour;
    speedLimitSignDOM.style.float =
        settings.slLocation == "rightSpeedSign" ? "right" : "left";
    unitDOM.style.color = settings.unitColour;
    unregisterBlink(unitDOM);
    switch (settings.units) {
        case "setting_KMH":
            unitDOM.textContent = "KMH";
            break;
        case "setting_MPH":
            unitDOM.textContent = "MPH";
            break;
        case "setting_LOC":
            // Blink last known unit
            // When found, it will unblink
            if (lastKnownLocalUnit == null) {
                unitDOM.textContent = "M/S";
                registerBlink(unitDOM);
            }
            break;
    }
    // https://stackoverflow.com/questions/17090571/is-there-a-way-to-set-background-image-as-a-base64-encoded-image
    if (settings.bgImage) {
        let url = localStorage.getItem(settings.bgImage);
        document.body.style.backgroundImage = `url(${url})`;
    }
    document.body.style.backgroundColor = settings.bgColour;
}
function settingsDeepEqual(a, b) {
    const keys = [
        "bgColour",
        "streetColour",
        "unitColour",
        "speedColour",
        "bgImage",
        "slLocation",
        "units",
    ];
    return keys.every((key) => a[key] === b[key]);
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
function handleGPSInfo(position) {
    // Handle GPS location updates here
    console.log(`handleGPSInfo called ${position.coords.speed}`);
    let speed = position.coords.speed; // null check is present below
    let streetPosition;
    fetchSpeedLimitAPI(position)
        .then((resp) => {
        resp.json().then((json) => {
            streetPosition = json;
            console.log(json);
            updateStreetInformation(streetPosition);
        }, (error) => {
            //  FIXME: Improve error handling
            console.log("Something went wrong downloading this", error);
        });
    })
        .catch((error) => {
        console.log("Something went wrong downloading this", error);
    });
    if (speed == null) {
        // Blink animation
        speedDOM.textContent = "--";
        registerBlink(speedDOM);
    }
    else {
        unregisterBlink(speedDOM);
        // respect settings
        switch (currentSettings.units) {
            case "setting_KMH":
                speedDOM.textContent = Math.round(speed * 3.6).toString();
                break;
            case "setting_MPH":
                speedDOM.textContent = Math.round(speed * 2.23694).toString();
                break;
            case "setting_LOC":
                // This case is usually handled by updateStreetInformation();
                if (lastKnownLocalUnit == null) {
                    speedDOM.textContent = Math.round(speed).toString();
                }
                break;
        }
    }
}
function updateStreetInformation(streetInfo) {
    console.log("Street info: ", streetInfo);
    if (streetInfo.status != "OK") {
        // ATM, do nothing
        speedLimitSignDOM.style.opacity = "0";
        console.log("Street information is empty.");
        return;
    }
    unitDOM.textContent = streetInfo.localSpeedLimit.toString();
    speedDOM.textContent = streetInfo.siSpeed.toString();
    unregisterBlink(unitDOM);
    streetDOM.textContent = streetInfo.name;
    speedLimitSignDOM.style.opacity = "100";
    //  FIXME: This needs to respect settings, this should change based on whether the user wants it to.
    speedLimitTextDOM.textContent = streetInfo.localSpeedLimit.toString();
}
// https://developer.mozilla.org/en-US/docs/Web/API/PermissionStatus/change_event
function processGeolocationPermission() {
    return __awaiter(this, void 0, void 0, function* () {
        let result = yield navigator.permissions.query({
            name: "geolocation",
        });
        console.log(`Geolocation state: ${result.state}`);
        if (result.state == "granted") {
            return true;
        }
        else if (result.state == "denied") {
            return false;
        }
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
            // User may not click "always allow", in this case the permission status does not change.
            () => {
                resolve(true);
            }, () => {
                resolve(false);
            }); // Trigger a prompt
            result.onchange = () => {
                // When user checks the "always allow" box in the prompt, this block will run regardless of their choice.
                console.log(`Geolocation state permanently updated: ${result.state}`);
                if (result.state == "granted") {
                    resolve(true);
                }
                else if (result.state == "denied") {
                    reject(false);
                }
                else {
                    console.log("Something went wrong! See processGeolocationPermission");
                    reject(false);
                }
            };
        });
    });
}
function generatePositionString(position) {
    return `lat=${position.coords.latitude}&lon=${position.coords.longitude}`;
}
function fetchSpeedLimitAPI(position) {
    return __awaiter(this, void 0, void 0, function* () {
        return fetch(SPEEDLIMIT_API_URL + "?" + generatePositionString(position), {
            mode: "cors",
        });
    });
}
function init() {
    // Do any initialisation here
    speedDOM = document.getElementById("speed");
    streetDOM = document.getElementById("street");
    unitDOM = document.getElementById("unit");
    speedLimitSignDOM = document.getElementById("speedLimitSign");
    speedLimitTextDOM = document.getElementById("speedLimitText");
    closeBurgerDOM = document.getElementById("closeBurger");
    hamburgerDOM = document.getElementById("openHamburger");
    settingsDOM = document.getElementById("settings");
    mainPageDOM = document.getElementById("mainPage");
    saveSettings(currentSettings);
    if (isSettingsCustom()) {
        writeSettings(currentSettings);
    }
    applySettings(currentSettings);
    if (window.screen.width <= 600) {
        // Mobile only
        openSettings();
    }
    processGeolocationPermission().then(() => {
        // attach listener
        console.log("Got permissions!");
        navigator.geolocation.watchPosition(handleGPSInfo, (error) => {
            // WARN: spammy log
            // console.log("Permission granted, but error on get! ", error);
        }, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
        });
    }, () => {
        console.log("Failed to get permissions!");
    });
}
document.addEventListener("DOMContentLoaded", init);
