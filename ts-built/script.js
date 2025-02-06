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
let blinkId = startBlinkEngine();
let previousSpeed = null;
let lastKnownSpeedLimit = null;
let timeoutId = 0;
var Unit;
(function (Unit) {
    Unit["kmh"] = "setting_KMH";
    Unit["mph"] = "setting_MPH";
    Unit["loc"] = "setting_LOC";
})(Unit || (Unit = {}));
class Speed {
    constructor(unit, speed) {
        this.rawSpeed = speed;
        // Typescript isn't smart enough to figure out that speed and unit are init once;
        this.unit = null;
        this.speed = 0;
        let process = (unit) => {
            switch (unit) {
                case Unit.kmh:
                    this.speed = Math.round(3.6 * this.rawSpeed);
                    this.unit = Unit.kmh;
                    break;
                case Unit.mph:
                    this.speed = Math.round(2.23694 * this.rawSpeed);
                    this.unit = Unit.mph;
                    break;
                case null: // m/s
                    this.speed = Math.round(this.rawSpeed);
                    break;
            }
        };
        if (Unit.loc == unit) {
            process(lastKnownLocalUnit);
        }
        else {
            process(unit);
        }
    }
    difference(speed) {
        if (speed.unit != this.unit) {
            speed = speed.convertTo(this.unit);
        }
        return this.speed - speed.speed;
    }
    static getApiUnit(info) {
        let unit = null;
        if (info.localSpeedUnit == "km/h") {
            unit = Unit.kmh;
        }
        else {
            unit = Unit.mph;
        }
        return unit;
    }
    static convertCall(info) {
        return new Speed(this.getApiUnit(info), info.siSpeed);
    }
    generateAccelerate(accelTo) {
        return accelerate(this.speed, accelTo.speed);
    }
    getSpeed() {
        return this.speed;
    }
    getUnit() {
        return this.unit;
    }
    convertTo(unit) {
        return new Speed(unit, this.rawSpeed);
    }
}
Speed.identity = new Speed(null, 0);
const defaultSettings = Object.freeze({
    units: Unit.mph,
    bgColour: "#000000",
    speedColour: "#FFFFFF",
    unitColour: "#FFFFFF",
    streetColour: "#FFFFFF",
    bgImage: null,
    slLocation: "rightSpeedSign",
});
let currentSettings = fastClone(defaultSettings);
function accelerate(previousSpeed, newSpeed) {
    let stepCount;
    if (previousSpeed == newSpeed) {
        speedDOM.textContent = previousSpeed.toString();
        return;
    }
    stepCount = Math.abs(previousSpeed - newSpeed);
    let step = (x) => {
        return Math.pow(x, 2); // Logarithmic function to slow down over time
    };
    // Adjust the lock function to map the steps to a range that slows down
    let lock = (x) => {
        return 1 + ((x - 1) / (stepCount - 1)) * 16; // Map x to a range of 1 to 10
    };
    let initStep = step(lock(1)) * 10;
    for (let i = 1; i <= stepCount; i++) {
        setTimeout(() => {
            if (previousSpeed < newSpeed) {
                speedDOM.textContent = (previousSpeed + i).toString();
            }
            else {
                speedDOM.textContent = (previousSpeed - i).toString();
            }
        }, step(lock(i)) * 10 - initStep);
    }
}
function startBlinkEngine() {
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
    settings.units =
        // @ts-expect-error // This is stupid.
        Unit[Object.keys(Unit).find((key) => key == unitSelected[0].value)];
    settings.slLocation = locationSelected[0].id;
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
function applyUnit(settings) {
    let process = (unit) => {
        switch (unit) {
            case "setting_KMH":
                unitDOM.textContent = "KMH";
                break;
            case "setting_MPH":
                unitDOM.textContent = "MPH";
                break;
        }
    };
    if (settings.units == Unit.loc) {
        if (lastKnownLocalUnit == null) {
            unitDOM.textContent = "M/S";
            registerBlink(unitDOM);
        }
        else {
            process(lastKnownLocalUnit);
        }
    }
    else {
        process(settings.units);
    }
}
// Pure styling, functional aspects found where they are needed.
function applySettings(settings) {
    streetDOM.style.color = settings.streetColour;
    speedDOM.style.color = settings.speedColour;
    speedLimitSignDOM.style.float =
        settings.slLocation == "rightSpeedSign" ? "right" : "left";
    unitDOM.style.color = settings.unitColour;
    unregisterBlink(unitDOM);
    applyUnit(settings);
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
function handleGPSInfo(position) {
    // Handle GPS location updates here
    console.log(`speed: ${position.coords.speed}`);
    let speed = new Speed(currentSettings.units, position.coords.speed);
    let streetPosition;
    fetchSpeedLimitAPI(position)
        .then((resp) => {
        resp.json().then((json) => {
            streetPosition = json;
            updateStreetInformation(streetPosition);
        }, (error) => {
            //  FIXME: Improve error handling
            console.log("Something went wrong downloading this", error);
        });
    })
        .catch((error) => {
        console.log("Something went wrong downloading this", error);
    });
    if (position.coords.speed == null) {
        if (timeoutId == 0 && speedDOM.textContent != "--") {
            timeoutId = setTimeout(() => {
                registerBlink(speedDOM);
                timeoutId = setTimeout(() => {
                    unregisterBlink(speedDOM);
                    if (timeoutId == 0)
                        return;
                    speedDOM.textContent = "--";
                    previousSpeed = null;
                }, 5000);
            }, 7000);
        }
        return;
    }
    else {
        clearTimeout(timeoutId);
        unregisterBlink(speedDOM);
        timeoutId = 0;
    }
    if (lastKnownSpeedLimit != null) {
        //NOTE: difference is: this.speed - a.speed
        let difference = speed.difference(lastKnownSpeedLimit);
        if (difference >= 0) {
            speedDOM.style.color = "red";
        }
        else if (difference >= -5) {
            speedDOM.style.color = "orange";
        }
        else {
            speedDOM.style.color = currentSettings.speedColour;
        }
    }
    else {
        speedDOM.style.color = currentSettings.speedColour;
    }
    if (previousSpeed != null) {
        previousSpeed.generateAccelerate(speed);
    }
    else {
        speedDOM.textContent = speed.getSpeed().toString();
    }
    previousSpeed = speed;
}
function updateStreetInformation(streetInfo) {
    console.log("Street info: ", streetInfo);
    if (streetInfo.status != "OK") {
        // ATM, do nothing
        speedLimitSignDOM.style.opacity = "0";
        streetDOM.textContent = "--";
        lastKnownSpeedLimit = null;
        console.log("Street information is empty.");
        return;
    }
    if (lastKnownLocalUnit == null) {
        // When missing, it is blinking
        unregisterBlink(unitDOM);
    }
    lastKnownLocalUnit = Speed.getApiUnit(streetInfo);
    lastKnownSpeedLimit = Speed.convertCall(streetInfo);
    applyUnit(currentSettings);
    let speed = new Speed(currentSettings.units, streetInfo.siSpeed);
    speedLimitTextDOM.textContent = speed.getSpeed().toString();
    streetDOM.textContent = streetInfo.name;
    speedLimitSignDOM.style.opacity = "100";
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
    else {
        writeSettings(defaultSettings);
    }
    applySettings(currentSettings);
    if (window.screen.width <= 600) {
        // Mobile portrait only
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
