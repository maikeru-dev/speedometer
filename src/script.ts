"use strict";

const SPEEDLIMIT_API_URL =
  "https://devweb2024.cis.strath.ac.uk/aes02112-nodejs/speed";
let speedDOM: HTMLElement; // Can't const declare without init :(
let streetDOM: HTMLElement;
let unitDOM: HTMLElement;
let closeBurgerDOM: HTMLElement;
let hamburgerDOM: HTMLElement;
let speedLimitTextDOM: HTMLElement;
let speedLimitSignDOM: HTMLElement;
let mainPageDOM: HTMLElement;
let settingsDOM: HTMLElement;
let lastKnownLocalUnit: Unit | null = null;
let blinkList: Array<HTMLElement> = [];
let blinkId = startBlinkEngine();
let previousSpeed: Speed | null = null;
let lastGeolocationPosition: GeolocationPosition | null = null;
let lastKnownSpeedLimit: Speed | null = null;
let watchPositionId = 0;
let timeoutId = 0;

enum Unit {
  kmh = "setting_KMH",
  mph = "setting_MPH",
  loc = "setting_LOC",
}

class Speed {
  unit: Unit | null;
  speed: number;
  readonly rawSpeed: number;
  static readonly identity: Speed = new Speed(null, 0);

  constructor(unit: Unit | null, speed: number) {
    this.rawSpeed = speed;

    // Typescript isn't smart enough to figure out that speed and unit are init once;
    this.unit = null;
    this.speed = 0;

    let process = (unit: Unit | null) => {
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
          console.log("unknown ", this.speed);
          this.speed = Math.round(this.rawSpeed);
          this.unit = null;
          break;
      }
    };

    console.log(this.unit);
    if (Unit.loc == unit) {
      process(lastKnownLocalUnit);
    } else {
      process(unit);
    }
  }

  difference(speed: Speed) {
    if (speed.unit != this.unit) {
      speed = speed.convertTo(this.unit!);
    }

    return this.speed - speed.speed;
  }
  static getApiUnit(info: StreetPosition): Unit {
    let unit = null;
    if (info.localSpeedUnit == "km/h") {
      unit = Unit.kmh;
    } else {
      unit = Unit.mph;
    }
    return unit;
  }

  static convertCall(info: StreetPosition): Speed {
    return new Speed(this.getApiUnit(info), info.siSpeed);
  }

  generateAccelerate(accelTo: Speed) {
    return accelerate(this.speed, accelTo.speed);
  }

  getSpeed(): number {
    return this.speed;
  }
  getUnit(): Unit | null {
    return this.unit;
  }

  convertTo(unit: Unit): Speed {
    return new Speed(unit, this.rawSpeed);
  }
}

interface Settings {
  units: Unit;
  bgColour: string;
  speedColour: string;
  unitColour: string;
  streetColour: string;
  bgImage: string | null;
  slLocation: string;
}

const defaultSettings: Settings = Object.freeze({
  units: Unit.mph,
  bgColour: "#000000",
  speedColour: "#FFFFFF",
  unitColour: "#FFFFFF",
  streetColour: "#FFFFFF",
  bgImage: null,
  slLocation: "rightSpeedSign",
});

let currentSettings: Settings = fastClone(defaultSettings);

interface StreetPosition {
  copyright: string;
  warning: string;
  localSpeedLimit: number;
  localSpeedUnit: string;
  siSpeed: number;
  name: string;
  status: string;
  lat: string;
  lon: string;
  cached: boolean;
}

function accelerate(previousSpeed: number, newSpeed: number) {
  let stepCount;

  if (previousSpeed == newSpeed) {
    speedDOM.textContent = previousSpeed.toString();
    return;
  }

  stepCount = Math.abs(previousSpeed - newSpeed);

  let step = (x: number) => {
    return Math.pow(x, 2); // Logarithmic function to slow down over time
  };

  // Adjust the lock function to map the steps to a range that slows down
  let lock = (x: number) => {
    return 1 + ((x - 1) / (stepCount - 1)) * 16; // Map x to a range of 1 to 10
  };

  let initStep = step(lock(1)) * 10;

  for (let i = 1; i <= stepCount; i++) {
    setTimeout(
      () => {
        if (previousSpeed < newSpeed) {
          speedDOM.textContent = (previousSpeed + i).toString();
        } else {
          speedDOM.textContent = (previousSpeed - i).toString();
        }
      },
      step(lock(i)) * 10 - initStep,
    );
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
function registerBlink(key: HTMLElement) {
  if (blinkList.indexOf(key) == -1) {
    blinkList.push(key);
  }
}
function unregisterBlink(key: HTMLElement) {
  let i = blinkList.indexOf(key);
  if (i == -1) return;

  blinkList.splice(i, 1);
  key.style.visibility = "visible";
}

function isSettingsCustom(): boolean {
  return localStorage.getItem("customSettings") != null;
}
function saveSettings(settings: Settings): void {
  if (currentSettings == defaultSettings) {
    console.log("wtf");
  }

  var inputElements: HTMLCollectionOf<Element> =
    document.getElementsByClassName("settingUnits");
  var unitSelected: Array<HTMLInputElement> = Array.prototype.filter.call(
    inputElements,
    (element: HTMLInputElement) => {
      return element.checked == true;
    },
  );

  inputElements = document.getElementsByClassName("settingSignLocation");
  var locationSelected: Array<HTMLInputElement> = Array.prototype.filter.call(
    inputElements,
    (element: HTMLInputElement) => {
      return element.checked == true;
    },
  );

  if (unitSelected.length != 1 || locationSelected.length != 1) {
    console.log(
      "Something has gone horribly wrong",
      unitSelected,
      locationSelected,
    );
  }

  settings.units =
    // @ts-expect-error // This is stupid.
    Unit[Object.keys(Unit).find((key) => key == unitSelected[0].value)];

  settings.slLocation = locationSelected[0].id;
  settings.bgColour = (
    document.getElementById("bgColour") as HTMLInputElement
  ).value;
  settings.speedColour = (
    document.getElementById("speedColour") as HTMLInputElement
  ).value;
  settings.unitColour = (
    document.getElementById("unitColour") as HTMLInputElement
  ).value;
  settings.streetColour = (
    document.getElementById("streetColour") as HTMLInputElement
  ).value;
  var fileUpload = document.getElementById("fileUpload") as HTMLInputElement;
  if (fileUpload.files?.length == 1) {
    const reader = new FileReader();
    let base64File;
    reader.onloadend = () => {
      base64File = reader.result;
      settings.bgImage = "bgImage";
      localStorage.setItem(settings.bgImage, base64File!.toString());
      // WARN: This is an exception, this will update the bg right away due to being async!
      document.body.style.backgroundImage = `url(${base64File})`;
    };
    reader.readAsDataURL(fileUpload.files![0]);
  }
}
function writeSettings(settings: Settings): void {
  (document.getElementById(settings.units) as HTMLInputElement).checked = true;
  (document.getElementById(settings.slLocation) as HTMLInputElement).checked =
    true;

  (document.getElementById("speedColour") as HTMLInputElement).value =
    settings.speedColour;
  (document.getElementById("streetColour") as HTMLInputElement).value =
    settings.streetColour;
  (document.getElementById("bgColour") as HTMLInputElement).value =
    settings.bgColour;
  (document.getElementById("unitColour") as HTMLInputElement).value =
    settings.unitColour;

  if (settings.bgImage) {
    //(document.getElementById("fileUpload") as HTMLInputElement).files = new FileList.new(); localStorage.getItem(settings.bgImage)!;
    //window.atob(settings.bgImage); forget this
  }
}

function fastClone(a: any) {
  return JSON.parse(JSON.stringify(a));
}

function openSettings(): void {
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
function closeSettings(): void {
  // save from DOM
  let newSettings: Settings = {} as Settings;
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
  (document.getElementById("fileUpload") as HTMLInputElement).value = "";
  currentSettings.bgImage = null;
}

function applyUnit(settings: Settings) {
  let process = (unit: Unit) => {
    switch (unit) {
      case "setting_KMH":
        unitDOM.textContent = "KMH";
        break;
      case "setting_MPH":
        unitDOM.textContent = "MPH";
        break;
    }

    if (previousSpeed != null) {
      const newSpeed = previousSpeed.convertTo(unit);
      previousSpeed.generateAccelerate(newSpeed);
      previousSpeed = newSpeed;
    }
  };

  // NOTE: this is overtly complex, why!
  if (settings.units == Unit.loc) {
    if (lastKnownLocalUnit == null) {
      unitDOM.textContent = "M/S";
      if (previousSpeed != null) {
        const newSpeed = previousSpeed.convertTo(Unit.loc);
        previousSpeed.generateAccelerate(newSpeed);
        previousSpeed = newSpeed;
      }
      registerBlink(unitDOM);
    } else {
      process(lastKnownLocalUnit);
    }
  } else {
    process(settings.units);
  }
}

// Pure styling, functional aspects found where they are needed.
function applySettings(settings: Settings): void {
  streetDOM.style.color = settings.streetColour;
  speedDOM.style.color = settings.speedColour;
  speedLimitSignDOM.style.float =
    settings.slLocation == "rightSpeedSign" ? "right" : "left";
  unitDOM.style.color = settings.unitColour;

  unregisterBlink(unitDOM);
  applyUnit(settings);

  // https://stackoverflow.com/questions/17090571/is-there-a-way-to-set-background-image-as-a-base64-encoded-image
  if (settings.bgImage) {
    let url = localStorage.getItem(settings.bgImage!)!;

    document.body.style.backgroundImage = `url(${url})`;
  }

  document.body.style.backgroundColor = settings.bgColour;
}
function settingsDeepEqual(a: Settings, b: Settings): boolean {
  const keys: (keyof Settings)[] = [
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

function handleGPSInfo(position: GeolocationPosition): void {
  // Handle GPS location updates here
  console.log(`speed: ${position.coords.speed}`);
  let speed: Speed = new Speed(currentSettings.units, position.coords.speed!);
  let streetPosition: StreetPosition;

  lastGeolocationPosition = position;

  fetchSpeedLimitAPI(position)
    .then((resp) => {
      resp.json().then(
        (json) => {
          streetPosition = json as StreetPosition;
          updateStreetInformation(streetPosition);
        },
        (error) => {
          //  FIXME: Improve error handling
          console.log("Something went wrong downloading this", error);
        },
      );
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
          if (timeoutId == 0) return;
          speedDOM.textContent = "--";
          previousSpeed = null;
        }, 5000);
      }, 7000);
    }
    return;
  } else {
    clearTimeout(timeoutId);
    unregisterBlink(speedDOM);
    timeoutId = 0;
  }

  if (lastKnownSpeedLimit != null) {
    //NOTE: difference is: this.speed - a.speed
    let difference = speed.difference(lastKnownSpeedLimit);
    if (difference >= 0) {
      speedDOM.style.color = "red";
    } else if (difference >= -5) {
      speedDOM.style.color = "orange";
    } else {
      speedDOM.style.color = currentSettings.speedColour;
    }
  } else {
    speedDOM.style.color = currentSettings.speedColour;
  }

  if (previousSpeed != null) {
    previousSpeed.generateAccelerate(speed);
  } else {
    speedDOM.textContent = speed.getSpeed().toString();
  }

  previousSpeed = speed;
}
function updateStreetInformation(streetInfo: StreetPosition): void {
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
async function processGeolocationPermission(): Promise<boolean> {
  let result: PermissionStatus = await navigator.permissions.query({
    name: "geolocation",
  });

  console.log(`Geolocation state: ${result.state}`);
  if (result.state == "granted") {
    return true;
  } else if (result.state == "denied") {
    return false;
  }

  return new Promise<boolean>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      // User may not click "always allow", in this case the permission status does not change.
      () => {
        resolve(true);
      },
      () => {
        resolve(false);
      },
    ); // Trigger a prompt

    result.onchange = () => {
      // When user checks the "always allow" box in the prompt, this block will run regardless of their choice.
      console.log(`Geolocation state permanently updated: ${result.state}`);
      if (result.state == "granted") {
        resolve(true);
      } else if (result.state == "denied") {
        reject(false);
      } else {
        console.log("Something went wrong! See processGeolocationPermission");
        reject(false);
      }
    };
  });
}

function generatePositionString(position: GeolocationPosition): string {
  return `lat=${position.coords.latitude}&lon=${position.coords.longitude}`;
}

async function fetchSpeedLimitAPI(
  position: GeolocationPosition,
): Promise<Response> {
  return fetch(SPEEDLIMIT_API_URL + "?" + generatePositionString(position), {
    mode: "cors",
  });
}
function echoLastPosition(newSpeed: number) {
  let newPosition = fastClone(lastGeolocationPosition);
  newPosition.coords.speed = newSpeed;
  handleGPSInfo(newPosition);
}
function silenceWatchPositionHandler() {
  navigator.geolocation.clearWatch(watchPositionId);
  return;
}

function init(): void {
  // Do any initialisation here
  speedDOM = document.getElementById("speed")!;
  streetDOM = document.getElementById("street")!;
  unitDOM = document.getElementById("unit")!;
  speedLimitSignDOM = document.getElementById("speedLimitSign")!;
  speedLimitTextDOM = document.getElementById("speedLimitText")!;
  closeBurgerDOM = document.getElementById("closeBurger")!;
  hamburgerDOM = document.getElementById("openHamburger")!;
  settingsDOM = document.getElementById("settings")!;
  mainPageDOM = document.getElementById("mainPage")!;

  saveSettings(currentSettings);
  if (isSettingsCustom()) {
    writeSettings(currentSettings);
  } else {
    writeSettings(defaultSettings);
  }
  applySettings(currentSettings);

  if (window.screen.width <= 600) {
    // Mobile portrait only
    openSettings();
  }

  processGeolocationPermission().then(
    () => {
      // attach listener
      console.log("Got permissions!");
      watchPositionId = navigator.geolocation.watchPosition(
        handleGPSInfo,
        (error: GeolocationPositionError) => {
          // WARN: spammy log
          // console.log("Permission granted, but error on get! ", error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        },
      );
    },
    () => {
      console.log("Failed to get permissions!");
    },
  );
}

document.addEventListener("DOMContentLoaded", init);
