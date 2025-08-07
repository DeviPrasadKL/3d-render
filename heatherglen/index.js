/*
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";

document.addEventListener("DOMContentLoaded", function () {
  var Marzipano = window.Marzipano;
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA;

  // Initialize Swiper
  var swiper = new Swiper(".swiper", {
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    loop: false,
    initialSlide: 1, // 1st floor (index 1)
    on: {
      slideChange: function () {
        updateFloorIndicator(this.activeIndex);
      },
    },
  });

  function getFloorName(floor) {
    const floorNames = [
      "Garage Floor",
      "First Floor",
      "Second Floor",
      "Third Floor",
    ];
    return floorNames[floor];
  }

  // Update floor indicator text
  function updateFloorIndicator(index) {
    var floorText = document.querySelector(".swiper-floor");
    if (index === 0) {
      floorText.textContent = "Garage Floor";
    } else {
      floorText.textContent = getFloorName(index);
    }
    // Show the correct floor plan image for the current slide
    let floorPlanImages = document.querySelectorAll(".floorplan-image");
    floorPlanImages.forEach(function (img, idx) {
      img.style.display = idx === index ? "block" : "none";
    });
  }

  // Initialize floor indicator and floor plan image
  updateFloorIndicator(1); // Set to 1st floor on initial render

  // Handle map toggle
  var mapToggle = document.getElementById("mapToggle");
  var closeSwiper = document.getElementById("closeSwiper");
  var swiperContainer = document.querySelector(".swiper");
  closeSwiper.addEventListener("click", function () {
    swiperContainer.style.display = "none";
  });
  mapToggle.addEventListener("click", function () {
    if (
      swiperContainer.style.display === "none" ||
      !swiperContainer.style.display
    ) {
      swiperContainer.style.display = "block";
      hideAllLists();
      // Sync with current floor
      var currentFloor = document.querySelector(".floor-item.active");
      if (currentFloor) {
        if (currentFloor.textContent !== "GF") {
          var floorNumber = parseInt(currentFloor.textContent);
          swiper.slideTo(floorNumber);
        } else {
          swiper.slideTo(0);
        }
      }
    } else {
      swiperContainer.style.display = "none";
    }
  });

  // Close swiper when clicking outside
  document.addEventListener("click", function (e) {
    if (!swiperContainer.contains(e.target) && !mapToggle.contains(e.target)) {
      swiperContainer.style.display = "none";
    }
  });

  // Grab elements from DOM.
  var panoElement = document.querySelector("#pano");
  var sceneNameElement = document.querySelector("#titleBar .sceneName");
  // var autorotateToggleElement = document.querySelector('#autorotateToggle');
  var fullscreenToggleElement = document.querySelector("#fullscreenToggle");

  // Initialize only if elements exist
  // if (!panoElement || !sceneNameElement || !autorotateToggleElement || !fullscreenToggleElement) {
  if (!panoElement || !sceneNameElement || !fullscreenToggleElement) {
    console.error("Required elements not found");
    return;
  }

  panoElement.addEventListener("click", () => {
    hideAllLists();
  });

  // Detect desktop or mobile mode.
  if (window.matchMedia) {
    var setMode = function () {
      if (mql.matches) {
        document.body.classList.remove("desktop");
        document.body.classList.add("mobile");
      } else {
        document.body.classList.remove("mobile");
        document.body.classList.add("desktop");
      }
    };
    var mql = matchMedia("(max-width: 500px), (max-height: 500px)");
    setMode();
    mql.addListener(setMode);
  } else {
    document.body.classList.add("desktop");
  }

  // Detect whether we are on a touch device.
  document.body.classList.add("no-touch");
  window.addEventListener("touchstart", function () {
    document.body.classList.remove("no-touch");
    document.body.classList.add("touch");
  });

  // Use tooltip fallback mode on IE < 11.
  if (bowser.msie && parseFloat(bowser.version) < 11) {
    document.body.classList.add("tooltip-fallback");
  }

  // Viewer options.
  var viewerOpts = {
    controls: {
      mouseViewMode: data.settings.mouseViewMode,
    },
  };

  // Initialize viewer.
  var viewer = new Marzipano.Viewer(panoElement, viewerOpts);

  // Set a fixed cache-busting version string for this tour build (update this when you re-generate the tour)
  var cacheBuster = "v=250710-1300"; // Example: v=YYMMDD-HHMM, update as needed for each build

  // Create scenes.
  var scenes = data.scenes.map(function (data) {
    var urlPrefix = "tiles";
    // Add cache buster to all tile and preview URLs
    var tileUrl =
      urlPrefix + "/" + data.id + "/{z}/{f}/{y}/{x}.jpg?" + cacheBuster;
    var previewUrl = urlPrefix + "/" + data.id + "/preview.jpg?" + cacheBuster;
    var source = Marzipano.ImageUrlSource.fromString(tileUrl, {
      cubeMapPreviewUrl: previewUrl,
    });
    var geometry = new Marzipano.CubeGeometry(data.levels);

    var limiter = Marzipano.RectilinearView.limit.traditional(
      data.faceSize,
      (100 * Math.PI) / 180,
      (120 * Math.PI) / 180
    );
    var view = new Marzipano.RectilinearView(
      data.initialViewParameters,
      limiter
    );

    var scene = viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
      pinFirstLevel: true,
    });

    // Create link hotspots.
    data.linkHotspots.forEach(function (hotspot) {
      var element = createLinkHotspotElement(hotspot);
      scene
        .hotspotContainer()
        .createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    // Create info hotspots.
    data.infoHotspots.forEach(function (hotspot) {
      var element = createInfoHotspotElement(hotspot);
      scene
        .hotspotContainer()
        .createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    return {
      data: data,
      scene: scene,
      view: view,
    };
  });

  // Set up autorotate, if enabled.
  var autorotate = Marzipano.autorotate({
    yawSpeed: 0.03,
    targetPitch: 0,
    targetFov: Math.PI / 2,
  });
  // if (data.settings.autorotateEnabled) {
  //   autorotateToggleElement.classList.add('enabled');
  // }

  // Set handler for autorotate toggle.
  // autorotateToggleElement.addEventListener('click', toggleAutorotate);

  // Set up fullscreen mode, if supported.
  fullscreenToggleElement.addEventListener("click", function () {
    screenfull.toggle();
    if (fullscreenToggleElement.classList.contains("enabled")) {
      fullscreenToggleElement.classList.remove("enabled");
      fullscreenToggleElement.setAttribute("tool-tip", "Fullscreen");
    } else {
      fullscreenToggleElement.classList.add("enabled");
      fullscreenToggleElement.setAttribute("tool-tip", "Exit Fullscreen");
    }
  });

  // Set handler for scene switch.
  if (scenes.length > 0) {
    // Organize scenes into rooms and floors
    var roomsContainer = document.querySelector(".rooms-container");
    var floorsContainer = document.querySelector(".floors-container");
    var roomsList = document.getElementById("roomsList");
    var floorsList = document.getElementById("floorsList");
    var roomsToggle = document.getElementById("roomsToggle");
    var floorsToggle = document.getElementById("floorsToggle");
    var contactToggle = document.getElementById("contactToggle");
    var contactCard = document.querySelector(".contact-card");
    let isCardVisible = false;

    contactToggle.addEventListener("click", function (e) {
      // e.stopPropagation(); // Prevent background click from firing
      isCardVisible = !isCardVisible;
      contactCard.style.display = isCardVisible ? "block" : "none";
    });

    // Close when clicking anywhere outside the contact-card
    document.addEventListener("click", function (e) {
      if (
        isCardVisible &&
        !contactCard.contains(e.target) &&
        !contactToggle.contains(e.target)
      ) {
        contactCard.style.display = "none";
        isCardVisible = false;
      }
    });

    // Sort scenes into floors
    var floors = {};
    scenes.forEach(function (scene) {
      var floorMatch = scene.data.name.match(/(\d+)F$/);
      var basementMatch = scene.data.name.match(/B$/);
      var floor;
      if (basementMatch) {
        floor = "GF";
      } else if (floorMatch) {
        floor = floorMatch[1];
      } else {
        floor = "1";
      }
      if (!floors[floor]) {
        floors[floor] = [];
      }
      floors[floor].push(scene);
    });

    // Custom sort: GF first, then 1, 2, 3, ...
    function customFloorSort(a, b) {
      if (a === "GF") return -1;
      if (b === "GF") return 1;
      return parseInt(a) - parseInt(b);
    }

    // Create room items (initially hidden)
    scenes.forEach(function (scene) {
      // Only create room items for scenes with -M- or -ME- in the name
      if (
        scene.data.name.includes("- M -") ||
        scene.data.name.includes("- ME -")
      ) {
        var div = document.createElement("div");
        div.className = "room-item";
        var span = document.createElement("span");
        span.className = "text-span";

        // Remove floor suffix and type indicators for display
        var displayName = scene.data.name
          .replace(/[-]?\d+F$/, "") // Remove floor suffix
          .replace(/[-]?B$/, "") // Remove B suffix
          .replace(/\s*-\s*[ME]+\s*-/, "") // Remove type indicators
          .trim();
        span.textContent = displayName;

        // Extract floor number or GF
        var floorMatch = scene.data.name.match(/(\d+)F$/);
        var basementMatch = scene.data.name.match(/B$/);
        var floorNumber = basementMatch
          ? "GF"
          : floorMatch
          ? floorMatch[1]
          : "1";
        div.setAttribute("data-floor", floorNumber);

        div.appendChild(span); // Add the span to the div
        div.style.display = "none"; // Hide initially
        div.addEventListener("click", function () {
          switchScene(scene, true);
          hideAllLists();
        });
        roomsContainer.appendChild(div);
      }
    });

    Object.keys(floors)
      .sort(customFloorSort)
      .forEach(function (floor) {
        var div = document.createElement("div");
        div.className = "floor-item";
        var span = document.createElement("span");
        span.className = "text-span";

        // Modify the textContent based on floor number
        if (floor !== "GF") {
          span.textContent = floor + "F";
        } else {
          span.textContent = floor;
        }

        div.appendChild(span); // Add the span to the div
        div.addEventListener("click", function () {
          // Hide all rooms first
          document.querySelectorAll(".room-item").forEach(function (item) {
            item.style.display = "none";
          });
          // Show only rooms for this floor
          document
            .querySelectorAll('.room-item[data-floor="' + floor + '"]')
            .forEach(function (item) {
              item.style.display = "flex";
            });

          // If there are any -E- or -ME- scenes for this floor, switch to the first one
          var elevatorScene = scenes.find(function (scene) {
            var floorMatch = scene.data.name.match(/(\d+)F$/);
            var basementMatch = scene.data.name.match(/B$/);
            var sceneFloor = basementMatch
              ? "GF"
              : floorMatch
              ? floorMatch[1]
              : "1";
            return (
              sceneFloor === floor &&
              (scene.data.name.includes("- E -") ||
                scene.data.name.includes("- ME -"))
            );
          });

          if (elevatorScene) {
            switchScene(elevatorScene, true);
          }
          // hide all lists
          hideAllLists();

          // Update active state for floors
          document.querySelectorAll(".floor-item").forEach(function (item) {
            item.classList.remove("active");
          });
          div.classList.add("active");

          // Update swiper if it's visible
          if (swiperContainer.style.display === "block") {
            const floorText = document.querySelector(".swiper-floor");
            if (floor !== "GF") {
              floorText.textContent = getFloorName(floor);
              var floorNumber = parseInt(floor);
              swiper.slideTo(floorNumber);
            } else {
              floorText.textContent = "Garage Floor";
              swiper.slideTo(0);
            }
          }
        });
        floorsContainer.appendChild(div);
      });

    // Show rooms for GF first if it exists, else show rooms for the initial floor
    let initialFloor;
    let initialFloorMatch = scenes[0].data.name.match(/(\d+)F$/);
    let initialBasementMatch = scenes[0].data.name.match(/B$/);
    initialFloor = initialBasementMatch
      ? "GF"
      : initialFloorMatch
      ? initialFloorMatch[1]
      : "1";
    document
      .querySelectorAll('.room-item[data-floor="' + initialFloor + '"]')
      .forEach(function (item) {
        item.style.display = "flex";
      });

    // Toggle handlers
    roomsToggle.addEventListener("click", function () {
      if (roomsList.classList.contains("visible")) {
        hideAllLists();
      } else {
        showRoomsList();
      }
    });

    floorsToggle.addEventListener("click", function () {
      if (floorsList.classList.contains("visible")) {
        hideAllLists();
        document.querySelector(".swiper").display = "none";
      } else {
        showFloorsList();
        document.querySelector(".swiper").display = "none";
      }
    });
  }

  function showRoomsList() {
    hideAllLists();
    roomsList.classList.remove("hidden");
    roomsList.classList.add("visible");
  }

  function showFloorsList() {
    hideAllLists();
    floorsList.classList.remove("hidden");
    floorsList.classList.add("visible");
  }

  function hideAllLists() {
    [roomsList, floorsList].forEach(function (list) {
      if (list.classList.contains("visible")) {
        list.classList.remove("visible");
        // Wait for the transition to complete before hiding
        setTimeout(function () {
          list.classList.add("hidden");
        }, 300); // Match this with your CSS transition time
      }
    });
  }

  // Update active states
  function updateActiveStates(scene) {
    document.querySelectorAll(".room-item").forEach(function (item) {
      item.classList.toggle("active", item.textContent === scene.data.name);
    });

    var floorMatch = scene.data.name.match(/(\d+)F$/);
    var basementMatch = scene.data.name.match(/B$/);
    var floor = basementMatch ? "GF" : floorMatch ? floorMatch[1] + "F" : "1F";
    document.querySelectorAll(".floor-item").forEach(function (item) {
      item.classList.toggle("active", item.textContent === floor);
    });
  }

  // Update the switchScene function to include active state updates
  function switchScene(scene, preserveView = false) {
    // stopAutorotate();
    // let currentViewParams = null;
    // if (preserveView) {
    //   // Get current view parameters from the active view
    //   currentViewParams = viewer.view().parameters();
    // }
    scene.scene.switchTo();
    // if (preserveView && currentViewParams) {
    //   scene.view.setParameters(currentViewParams);
    // } else if (!preserveView) {
    scene.view.setParameters(scene.data.initialViewParameters);
    // }
    // startAutorotate();
    updateSceneName(scene);
    updateActiveStates(scene);
  }

  function updateSceneName(scene) {
    // Remove the -1F, -2F, -3F suffix for display
    var displayName = scene.data.name.split("-")[0];
    sceneNameElement.textContent = displayName;
  }

  // function startAutorotate() {
  //   if (!autorotateToggleElement.classList.contains('enabled')) {
  //     return;
  //   }
  //   viewer.startMovement(autorotate);
  //   viewer.setIdleMovement(3000, autorotate);
  // }

  // function stopAutorotate() {
  //   viewer.stopMovement();
  //   viewer.setIdleMovement(Infinity);
  // }

  // function toggleAutorotate() {
  //   if (autorotateToggleElement.classList.contains('enabled')) {
  //     autorotateToggleElement.classList.remove('enabled');
  //     stopAutorotate();
  //   } else {
  //     autorotateToggleElement.classList.add('enabled');
  //     startAutorotate();
  //   }
  // }

  function createLinkHotspotElement(hotspot) {
    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement("div");
    wrapper.classList.add("hotspot");
    wrapper.classList.add("link-hotspot");

    // Create image element.
    var icon = document.createElement("img");
    icon.src = "img/link.png";
    icon.classList.add("link-hotspot-icon");
    icon.style.opacity = "0.5"; // Set initial opacity for inactive stated

    // Set rotation transform.
    var transformProperties = [
      "-ms-transform",
      "-webkit-transform",
      "transform",
    ];
    for (var i = 0; i < transformProperties.length; i++) {
      var property = transformProperties[i];
      icon.style[property] = "rotate(" + hotspot.rotation + "rad)";
    }

    // Add mouse enter and leave event handlers to change opacity
    wrapper.addEventListener("mouseenter", function () {
      icon.style.opacity = "1"; // Increase opacity when mouse is active
    });
    wrapper.addEventListener("mouseleave", function () {
      icon.style.opacity = "0.5"; // Decrease opacity when mouse is inactive
    });

    // Add click event handler.
    wrapper.addEventListener("click", function () {
      let activeGF = null;
      let active1F = null;
      let active2F = null;
      let active3F = null;
      // Find the floor items
      document.querySelectorAll(".floor-item").forEach(function (item) {
        if (
          item.textContent.trim() === "GF" &&
          item.classList.contains("active")
        ) {
          activeGF = item;
        } else if (
          item.textContent.trim() === "2F" &&
          item.classList.contains("active")
        ) {
          active2F = item;
        } else if (
          item.textContent.trim() === "1F" &&
          item.classList.contains("active")
        ) {
          active1F = item;
        } else if (
          item.textContent.trim() === "3F" &&
          item.classList.contains("active")
        ) {
          active3F = item;
        }
      });

      // Get the target scene name
      var targetSceneData = findSceneDataById(hotspot.target);
      var targetSceneDataName = targetSceneData.name;
      var targetSceneName = targetSceneData.name.split("-")[0].trim();

      // If the target scene is on 1F and currently on GF, activate 1F
      if (activeGF && targetSceneDataName.includes("Stairs - 1 - 1F")) {
        document.querySelectorAll(".floor-item").forEach(function (item) {
          if (item.textContent.trim() === "1F") {
            item.classList.add("active");
            // Also update the swiper if it's visible
            var swiperContainer = document.querySelector(".swiper");
            if (swiperContainer && swiperContainer.style.display === "block") {
              var swiper = document.querySelector(".swiper").swiper;
              if (swiper) {
                swiper.slideTo(1); // 1F would be at index 1 if GF is present
              }
            }
            // Show rooms for floor 1
            document
              .querySelectorAll(".room-item")
              .forEach(function (roomItem) {
                roomItem.style.display = "none";
              });
            document
              .querySelectorAll('.room-item[data-floor="1"]')
              .forEach(function (roomItem) {
                roomItem.style.display = "flex";
              });
          } else {
            item.classList.remove("active");
          }
        });
        // Existing logic for 1F to 2F
      } else if (active1F && targetSceneDataName.includes("Stairs - 1 - B")) {
        document.querySelectorAll(".floor-item").forEach(function (item) {
          if (item.textContent.trim() === "B") {
            item.classList.add("active");
            // Also update the swiper if it's visible
            var swiperContainer = document.querySelector(".swiper");
            if (swiperContainer && swiperContainer.style.display === "block") {
              var swiper = document.querySelector(".swiper").swiper;
              if (swiper) {
                document.querySelector(".swiper-floor").textContent =
                  "Garage Floor";
                swiper.slideTo(0); // GF would be at index 1 (0-based)
              }
            }
            // Show rooms for Ground Floor
            document
              .querySelectorAll(".room-item")
              .forEach(function (roomItem) {
                roomItem.style.display = "none";
              });
            document
              .querySelectorAll('.room-item[data-floor="0"]')
              .forEach(function (roomItem) {
                roomItem.style.display = "flex";
              });
          } else {
            item.classList.remove("active");
          }
        });
      } else if (active2F && targetSceneDataName.includes("Passage - 1 - 1F")) {
        // Find and activate the 1F floor item
        document.querySelectorAll(".floor-item").forEach(function (item) {
          if (item.textContent.trim() === "1F") {
            item.classList.add("active");
            // Also update the swiper if it's visible
            var swiperContainer = document.querySelector(".swiper");
            if (swiperContainer && swiperContainer.style.display === "block") {
              var swiper = document.querySelector(".swiper").swiper;
              if (swiper) {
                document.querySelector(".swiper-floor").textContent =
                  "Garage Floor";
                swiper.slideTo(0); // 1F would be at index 0 (0-based)
              }
            }
            // Show rooms for floor 1
            document
              .querySelectorAll(".room-item")
              .forEach(function (roomItem) {
                roomItem.style.display = "none";
              });
            document
              .querySelectorAll('.room-item[data-floor="1"]')
              .forEach(function (roomItem) {
                roomItem.style.display = "flex";
              });
          } else {
            item.classList.remove("active");
          }
        });
      } else if (active1F && targetSceneDataName.includes("Stairs - E - 2F")) {
        // Find and activate the 3F floor item
        document.querySelectorAll(".floor-item").forEach(function (item) {
          if (item.textContent.trim() === "2F") {
            item.classList.add("active");
            // Also update the swiper if it's visible
            var swiperContainer = document.querySelector(".swiper");
            if (swiperContainer && swiperContainer.style.display === "block") {
              var swiper = document.querySelector(".swiper").swiper;
              if (swiper) {
                document.querySelector(".swiper-floor").textContent = "Floor 2";
                swiper.slideTo(2); // 2F would be at index 2 (0-based)
              }
            }
            // Show rooms for floor 2
            document
              .querySelectorAll(".room-item")
              .forEach(function (roomItem) {
                roomItem.style.display = "none";
              });
            document
              .querySelectorAll('.room-item[data-floor="2"]')
              .forEach(function (roomItem) {
                roomItem.style.display = "flex";
              });
          } else {
            item.classList.remove("active");
          }
        });
      } else if (
        active3F &&
        targetSceneDataName.includes("Hallway - ME - 2F")
      ) {
        // Find and activate the 2F floor item
        document.querySelectorAll(".floor-item").forEach(function (item) {
          if (item.textContent.trim() === "2F") {
            item.classList.add("active");
            // Also update the swiper if it's visible
            var swiperContainer = document.querySelector(".swiper");
            if (swiperContainer && swiperContainer.style.display === "block") {
              var swiper = document.querySelector(".swiper").swiper;
              if (swiper) {
                document.querySelector(".swiper-floor").textContent = "Floor 1";
                swiper.slideTo(1); // 2F would be at index 1 (0-based)
              }
            }
            // Show rooms for floor 2
            document
              .querySelectorAll(".room-item")
              .forEach(function (roomItem) {
                roomItem.style.display = "none";
              });
            document
              .querySelectorAll('.room-item[data-floor="2"]')
              .forEach(function (roomItem) {
                roomItem.style.display = "flex";
              });
          } else {
            item.classList.remove("active");
          }
        });
      }

      // Switch to the target scene
      switchScene(findSceneById(hotspot.target), true);
    });

    // Prevent touch and scroll events from reaching the parent element.
    // This prevents the view control logic from interfering with the hotspot.
    stopTouchAndScrollEventPropagation(wrapper);

    // Create tooltip element.
    var tooltip = document.createElement("div");
    tooltip.classList.add("hotspot-tooltip");
    tooltip.classList.add("link-hotspot-tooltip");
    tooltip.innerHTML = findSceneDataById(hotspot.target).name.split("-")[0];

    wrapper.appendChild(icon);
    wrapper.appendChild(tooltip);

    return wrapper;
  }

  function createInfoHotspotElement(hotspot) {
    console.log("Info Hotspot clicked:", hotspot);

    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement("div");
    wrapper.classList.add("hotspot");
    wrapper.classList.add("info-hotspot");

    // Create hotspot/tooltip header.
    var header = document.createElement("div");
    header.classList.add("info-hotspot-header");

    // Create image element.
    var iconWrapper = document.createElement("div");
    iconWrapper.classList.add("info-hotspot-icon-wrapper");
    var icon = document.createElement("img");
    icon.src = "img/info.png";
    icon.classList.add("info-hotspot-icon");
    iconWrapper.appendChild(icon);

    // Create title element.
    var titleWrapper = document.createElement("div");
    titleWrapper.classList.add("info-hotspot-title-wrapper");
    var title = document.createElement("div");
    title.classList.add("info-hotspot-title");
    title.innerHTML = hotspot.title;
    titleWrapper.appendChild(title);

    // Create close element.
    var closeWrapper = document.createElement("div");
    closeWrapper.classList.add("info-hotspot-close-wrapper");
    var closeIcon = document.createElement("img");
    closeIcon.src = "img/close.png";
    closeIcon.classList.add("info-hotspot-close-icon");
    closeWrapper.appendChild(closeIcon);

    // Construct header element.
    header.appendChild(iconWrapper);
    header.appendChild(titleWrapper);
    header.appendChild(closeWrapper);

    // Create text element.
    var text = document.createElement("div");
    text.classList.add("info-hotspot-text");
    text.innerHTML = hotspot.text;

    // Place header and text into wrapper element.
    wrapper.appendChild(header);
    wrapper.appendChild(text);

    // Create a modal for the hotspot content to appear on mobile mode.
    var modal = document.createElement("div");
    modal.innerHTML = wrapper.innerHTML;
    modal.classList.add("info-hotspot-modal");
    document.body.appendChild(modal);

    var toggle = function () {
      wrapper.classList.toggle("visible");
      modal.classList.toggle("visible");
    };

    // Show content when hotspot is clicked.
    wrapper
      .querySelector(".info-hotspot-header")
      .addEventListener("click", function () {
        console.log("Info Hotspot clicked:", hotspot);
        toggle();
      });

    // Hide content when close icon is clicked.
    modal
      .querySelector(".info-hotspot-close-wrapper")
      .addEventListener("click", toggle);

    // Prevent touch and scroll events from reaching the parent element.
    // This prevents the view control logic from interfering with the hotspot.
    stopTouchAndScrollEventPropagation(wrapper);

    return wrapper;
  }

  // Prevent touch and scroll events from reaching the parent element.
  function stopTouchAndScrollEventPropagation(element, eventList) {
    var eventList = [
      "touchstart",
      "touchmove",
      "touchend",
      "touchcancel",
      "wheel",
      "mousewheel",
    ];
    for (var i = 0; i < eventList.length; i++) {
      element.addEventListener(eventList[i], function (event) {
        event.stopPropagation();
      });
    }
  }

  function findSceneById(id) {
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].data.id === id) {
        return scenes[i];
      }
    }
    return null;
  }

  function findSceneDataById(id) {
    for (var i = 0; i < data.scenes.length; i++) {
      if (data.scenes[i].id === id) {
        return data.scenes[i];
      }
    }
    return null;
  }
  switchScene(scenes[0]);

  // Display the initial scene.
  // On load, if 'GF' exists, start with 'Hallway - E - B' if present, else first scene of 'GF', else first sorted floor
  // var floorKeys = Object.keys(floors).sort(typeof customFloorSort === 'function' ? customFloorSort : undefined);
  // var initialScene;
  // if (floors['GF'] && floors['GF'].length > 0) {
  //   var hallwayE = floors['GF'].find(function (scene) {
  //     return scene.data.name.trim() === 'Hallway - E - B';
  //   });
  //   if (hallwayE) {
  //     initialScene = hallwayE;
  //   } else {
  //     initialScene = floors['GF'][0];
  //   }
  // } else {
  //   var initialFloorKey = floorKeys[0];
  //   initialScene = floors[initialFloorKey][0];
  // }
  // switchScene(initialScene);
});
