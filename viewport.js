// Import required OpenLayers modules. Could be replaced by NPM imports.
import "./ui.js";
import { plotHist } from "./plot.js";
import { makeCompass } from "./compass";
import { makeColorScale } from "./colorbar";
import "ol/ol.css";
import "./viewport.css";
import { std, mean } from "mathjs/number";
import Map from "ol/Map";
import View from "ol/View";
import VectorLayer from "ol/layer/Vector";
import TileLayer from "ol/layer/Tile";
import TileArcGISRest from "ol/source/TileArcGISRest";
import VectorSource from "ol/source/Vector";
import Overlay from "ol/Overlay";
import { fromLonLat, transformExtent } from "ol/proj";
import { Style, Fill, Stroke } from "ol/style";
import { fromExtent } from "ol/geom/Polygon";
import Feature from "ol/Feature";
import FullScreen from "ol/control/FullScreen";
import Rotate from "ol/control/Rotate";
import Zoom from "ol/control/Zoom";
import GeoJSON from "ol/format/GeoJSON";
import Select from "ol/interaction/Select";
import { extend, containsExtent, getCenter } from "ol/extent";
import { toLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import { defaults as defaultControls, Control, ScaleLine } from "ol/control";
import XYZ from "ol/source/XYZ";
import { toJpeg } from "html-to-image";
import jsPDF from "jspdf";

window.selectionType = "Connecticut";
window.townSelection = "";
window.cogSelection = "";
window.customSelection = "";

var compassElement = $("#compass")[0];
makeCompass(compassElement, function(theta) {
  map.getView().setRotation(-theta);
});

var container = $("#popup");

var popupOverlay = new Overlay({
  element: container[0],
  autoPan: true,
  autoPanAnimation: {
    duration: 250
  }
});

function closePopup() {
  popupOverlay.setPosition(undefined);
  select.getFeatures().clear();
  return false;
}

var jurisdiction_picker = $("#juris-picker");
var ind_layer_picker = $("#independent-layer-picker");
var out_layer_picker = $("#output-layer-picker");

$.getJSON("./metadata.json", function(data) {
  let layers = data.layers;
  let towns = data.towns;
  let cogs = data.cogs;
  function makeOption(name, code, type) {
    return $("<option/>", {
      text: name,
      value: code,
      data: {
        type: type
      }
    });
  }
  jurisdiction_picker
    .append(
      makeOption("Connecticut", "a", "Connecticut").attr("selected", "selected")
    )
    .append(makeOption("Custom Extent", "a", "Custom"));

  var sortedLayerKeys = Array(data.layerList.length);
  Object.keys(layers).forEach(function(key) {
    let nickname = layers[key].nickname;
    function findMatch(element) {
      return element == nickname;
    }
    let index = data.layerList.findIndex(findMatch);
    sortedLayerKeys[index] = key;
  });
  sortedLayerKeys.forEach(function(key) {
    let layerCode = key;
    let layerName = layers[key].nickname;
    let layerType = layers[key].layerType;
    if (layerType == "ind") {
      var option = makeOption(layerName, layerCode, "layer");
      ind_layer_picker.append(option);
    } else if (layerType == "out") {
      var option = makeOption(layerName, layerCode, "layer");
      out_layer_picker.append(option);
    }
  });
  window.independentLayer = ind_layer_picker
    .children()
    .first()
    .val();
  window.outLayer = out_layer_picker
    .children()
    .first()
    .val();
  window.currentLayer = window.independentLayer;

  Object.keys(towns).forEach(function(key) {
    let townCode = key;
    let townName = towns[key].nickname;
    let option = makeOption(townName, townCode, "Town");
    jurisdiction_picker.append(option);
  });
  Object.keys(cogs).forEach(function(key) {
    let cogCode = key;
    let cogName = cogs[key].nickname;
    let option = makeOption(cogName, cogCode, "COG");
    jurisdiction_picker.append(option);
  });
  window.metadata = data;

  jurisdiction_picker.combobox({
    label: "Select a jurisdiction",
    select: function(event, ui) {
      let choice = ui.value;
      let type = ui.type;
      if (type == "Custom") {
        window.selectionType = "Custom";
        selectedBounds.show();
      } else {
        selectedBounds.hide();
        if (type == "Connecticut") {
          window.selectionType = "Connecticut";
        } else if (type == "Town") {
          window.selectionType = "Town";
          window.townSelection = choice;
        } else if (type == "COG") {
          window.selectionType = "COG";
          window.cogSelection = choice;
        }
      }
      updateLayer();
      zoomToVectorExtent();
    }
  });

  ind_layer_picker.combobox({
    label: "Select a layer",
    select: function(event, ui) {
      window.independentLayer = ui.item.value;
      window.currentLayer = window.independentLayer;
      updateLayer();
    }
  });
  out_layer_picker.combobox({
    label: "Select an output layer",
    select: function(event, ui) {
      window.outLayer = ui.item.value;
      window.currentLayer = window.outLayer;
      updateLayer();
    }
  });
});

function updateLayer(resetStyle = false) {
  if (window.metadata) {
    vectorLayer.getSource().changed();
    calculateActiveVectorProperties();
    displayLayer(window.currentLayer);
    closePopup();
    if (resetStyle) {
      styleCache = {
        clear: new Style({
          fill: new Fill({
            color: window.colorScheme.clear
          }),
          stroke: null
        })
      };
    }
  }
}

function displayLayer(val) {
  let content = $("#ind-layer-exp");
  content.html("");
  let layerName = window.metadata.layers[val].nickname;
  let abstract = window.metadata.layers[val].abstract;
  let link = window.metadata.layers[val].link;
  let metalink = window.metadata.layers[val].metalink;
  let zipfile = window.metadata.layers[val].zipfile;

  content.append($("<h2>").text(layerName));
  var linkList = $("<ul>");
  if (link != "") {
    linkList.append(
      $("<li>").append(
        $("<a>")
          .text("Source Link")
          .attr("href", link)
          .attr("target", 'target="_blank"')
      )
    );
  }
  if (metalink != "") {
    linkList.append(
      $("<li>").append(
        $("<a>")
          .text("Metadata")
          .attr("href", metalink)
          .attr("target", 'target="_blank"')
      )
    );
  }

  if (metalink != "") {
    linkList.append(
      $("<li>").append(
        $("<a>")
          .text("Download GIS Layer")
          .attr("href", zipfile)
          .attr("target", 'target="_blank"')
      )
    );
  }
  content.append(linkList);
  content.append($("<p>").text(abstract));
  content.append($("<h3>").text("Selected Area Stats"));
  let plot = $("<div>").addClass("side-plot");
  content.append(plot);
  plotHist(window.layerProps.values, ".side-plot", colorRankInterpolate);
  let table = $("<table>");
  function addTableRow(thing, val) {
    let row = $("<tr>");
    row.append($("<td>").text(thing));
    row.append($("<td>").text(val));
    table.append(row);
  }
  addTableRow("Statistic", "Value");
  if (window.layerProps.dataCount != 0) {
    addTableRow("Mean Rank", window.layerProps.mean);
    addTableRow("Standard Deviation", window.layerProps.std);
    addTableRow("Min Rank", window.layerProps.min);
    addTableRow("Max Rank", window.layerProps.max);
  }
  addTableRow("Data Cell Count", window.layerProps.dataCount);
  addTableRow("Total Cell COunt", window.layerProps.totalCount);

  content.append($("<p>").html(table));
  changeInfo("ind-layer-exp");
}

// Change tooltip with jQuery UI
$(document).tooltip();

window.changeInfo = function(name) {
  if (name == "home") {
    var name = $(".home-info")[0].id;
  }
  $(".page-info").removeClass("current-info");
  var newInfo = $("#" + name);
  newInfo.addClass("current-info");
  if (newInfo.hasClass("home-info")) {
    $(".back-button").css("display", "none");
  } else {
    $(".back-button").css("display", "block");
  }
};

window.downloadMap = function() {
  map.once("rendercomplete", function(event) {
    var canvas = event.context.canvas;
    if (navigator.msSaveBlob) {
      navigator.msSaveBlob(canvas.msToBlob(), "map.png");
    } else {
      canvas.toBlob(function(blob) {
        saveAs(blob, "map.png");
      });
    }
  });
  map.renderSync();
};

function setColors(scheme, transparency) {
  var outScheme = {
    clear: [0, 0, 0, 0],
    transparent: [255, 255, 255, transparency * 0.3],
    one: scheme.one.slice(0, 3),
    two: scheme.two.slice(0, 3),
    three: scheme.three.slice(0, 3),
    four: scheme.four.slice(0, 3),
    five: scheme.five.slice(0, 3),
    name: scheme.name,
    code: scheme.code,
    transparency: transparency
  };
  outScheme.one.push(transparency);
  outScheme.two.push(transparency);
  outScheme.three.push(transparency);
  outScheme.four.push(transparency);
  outScheme.five.push(transparency);

  window.colorScheme = outScheme;
  updateLayer(true);
}
var scheme1 = {
  name: "Scheme 1",
  code: "a",
  one: [56, 168, 0],
  two: [139, 209, 0],
  three: [255, 255, 0],
  four: [255, 170, 0],
  five: [255, 0, 0]
};

var scheme2 = {
  name: "Scheme 2",
  code: "b",
  one: [100, 243, 255],
  two: [120, 94, 240],
  three: [220, 138, 127],
  four: [254, 97, 0],
  five: [255, 176, 0]
};

var scheme3 = {
  name: "Scheme 3",
  code: "c",
  one: [241, 238, 246],
  two: [215, 181, 216],
  three: [223, 101, 176],
  four: [221, 28, 119],
  five: [152, 0, 67]
};

setColors(scheme1, 0.7);

$("#color-box").colorbox({
  data: [scheme1, scheme2, scheme3],
  callback: setColors
});
$("#trans-slider").prop_slider({
  left: "Transparent",
  right: "Solid",
  max: 100,
  callback: function(value) {
    setColors(window.colorScheme, value);
    updateLayer(true);
  }
});

function colorRankInterpolate(rank) {
  if (rank < 0.8) {
    return window.colorScheme.transparent;
  } else if (rank < 1) {
    return window.colorScheme.one;
  } else if (rank < 2) {
    var prop = rank - 1;
    return window.colorScheme.one.map(
      (e, i) => (1 - prop) * e + prop * window.colorScheme.two[i]
    );
  } else if (rank < 3) {
    var prop = rank - 2;
    return window.colorScheme.two.map(
      (e, i) => (1 - prop) * e + prop * window.colorScheme.three[i]
    );
  } else if (rank < 4) {
    var prop = rank - 3;
    return window.colorScheme.three.map(
      (e, i) => (1 - prop) * e + prop * window.colorScheme.four[i]
    );
  } else if (rank < 5) {
    var prop = rank - 4;
    return window.colorScheme.four.map(
      (e, i) => (1 - prop) * e + prop * window.colorScheme.five[i]
    );
  } else {
    return window.colorScheme.five;
  }
}

function shouldShowFeature(feature) {
  if (window.selectionType == "Connecticut") {
    return true;
  } else if (window.selectionType == "Custom") {
    let featExtent = feature.getGeometry().getExtent();
    let boundingExtent = selectedBounds.getExtent();
    return containsExtent(boundingExtent, featExtent);
  } else if (
    window.selectionType == "Town" &&
    window.townSelection == feature.getProperties().t
  ) {
    return true;
  } else if (
    window.selectionType == "COG" &&
    window.cogSelection == feature.getProperties().c
  ) {
    return true;
  } else {
    return false;
  }
}

function calculateActiveVectorProperties() {
  var noZerosRankVales = Array();
  var rankValues = Array();
  var firstFeature = true;
  var featExtent = [];
  vectorLayer.getSource().forEachFeature(function(feature) {
    if (shouldShowFeature(feature)) {
      let rank = feature.getProperties()[window.currentLayer];
      // counts[Math.round(rank)] += 1;
      rankValues.push(rank);
      if (rank != 0) {
        noZerosRankVales.push(rank);
      }
      if (firstFeature) {
        featExtent = feature.getGeometry().getExtent();
        firstFeature = false;
      } else {
        extend(featExtent, feature.getGeometry().getExtent());
      }
    }
  });
  if (noZerosRankVales.length != 0) {
    window.layerProps = {
      totalCount: rankValues.length,
      dataCount: noZerosRankVales.length,
      min: Math.min(...noZerosRankVales).toFixed(2),
      max: Math.max(...noZerosRankVales).toFixed(2),
      mean: mean(...noZerosRankVales).toFixed(2),
      std: std(...noZerosRankVales).toFixed(2),
      values: rankValues
    };
  } else {
    window.layerProps = {
      totalCount: rankValues.length,
      dataCount: noZerosRankVales.length,
      values: rankValues
    };
  }
  window.activeExtent = featExtent;
}

function zoomToVectorExtent() {
  calculateActiveVectorProperties();
  map.getView().fit(window.activeExtent, { duration: 1000 });
}

function getRankValue(feature) {
  if (window.displayMode == "single") {
    var rank = feature.getProperties()[window.currentLayer];
    return rank;
  } else if (window.displayMode == "stressors") {
    let physical = feature.getProperties()["rb"]; // Hardcoded value
    let coastal = feature.getProperties()["qb"]; // Hardcoded value
    return (
      window.physical_coastal * physical +
      (1 - window.physical_coastal) * coastal
    );
  } else if (window.displayMode == "enviro-social") {
    let naturalHabitatExposure = feature.getProperties()["kb"]; // Hardcoded value
    let socialExposure = feature.getProperties()["ob"]; // Hardcoded value
    return (
      window.enviro_social * naturalHabitatExposure +
      (1 - window.enviro_social) * socialExposure
    );
  } else if (window.displayMode == "ExSenAd") {
    let properties = feature.getProperties(); 
    let exposure = properties["ub"]; // Hardcoded value;
    let sensitivity = properties["sb"]; // Hardcoded value;
    let adaptivity = properties["vb"]; // Hardcoded value;

    return (
      window.exposureCoef * exposure +
      window.sensitivityCoef * sensitivity -
      window.adaptivityCoef * adaptivity
    );
  }
}

var styleCache = {
  clear: new Style({
    fill: new Fill({
      color: window.colorScheme.clear
    }),
    stroke: null
  })
};
function colorStyle(feature) {
  if (feature) {
    let rank = getRankValue(feature);
    let inBounds = shouldShowFeature(feature);
    if (inBounds) {
      var style = styleCache[rank];
      if (style != null) {
        return style;
      }
      var color = colorRankInterpolate(rank);
    } else {
      return styleCache["clear"];
    }
    if (color == window.colorScheme.transparent) {
      var stroke = null;
    } else {
      var stroke = new Stroke({
        width: 2,
        color: color
      });
    }
    var style = (styleCache[rank] = new Style({
      fill: new Fill({
        color: color
      }),
      stroke: stroke
    }));
    return style;
  }
}

var vectorSource = new VectorSource({
  format: new GeoJSON(),
  url: "./data.json"
});

var vectorLayer = new VectorLayer({
  source: vectorSource,
  renderMode: "image",
  style: colorStyle
});

var streetLayer = new TileLayer({
  source: new XYZ({
    attributions:
      'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/' +
      'rest/services/World_Street_Map/MapServer">ArcGIS</a>',
    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/" +
      "World_Street_Map/MapServer/tile/{z}/{y}/{x}"
  })
});

var topoLayer = new TileLayer({
  source: new XYZ({
    attributions:
      'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/' +
      'rest/services/World_Topo_Map/MapServer">ArcGIS</a>',
    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/" +
      "World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
  })
});

var satLayer = new TileLayer({
  source: new XYZ({
    attributions:
      'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/' +
      'rest/services/World_Imagery/MapServer">ArcGIS</a>',
    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/" +
      "World_Imagery/MapServer/tile/{z}/{y}/{x}"
  })
});

vectorSource.once("change", function(e) {
  if (vectorSource.getState() === "ready") {
    $(".loading").remove();
  }
});

// Setting up the map
var map = new Map({
  layers: [vectorLayer],
  controls: [
    new Zoom(),
    // Modify fullscreen button to include sidebars
    new FullScreen({
      source: $("#viewer")[0]
    })
  ],
  target: "map",
  overlays: [popupOverlay],
  view: new View({
    // center: form
    center: fromLonLat([-72.8, 41.3]),
    zoom: 9
    // add zoom and extent limitations here later
  })
});

// Object that handles the selection of areas of interest by the user.
// It allows selecting from known geographical features, corner
// dragging, and and manual coordinate entry. It integrates with other
// map specific features.
var selectedBounds = {
  minX: null,
  minY: null,
  maxX: null,
  maxY: null,
  initialized: false,
  enabled: false,

  // Function to zoom to selected bounds
  zoomTo: function() {
    map.getView().fit(this.getExtent(), {
      duration: 2000
    });
  },

  // Returns selected extent in list of WGS84 coordinates. Only use if initialization has occured
  getExtent: function() {
    return [this.minX, this.minY, this.maxX, this.maxY];
  },

  // Returns extent in list of decimal degrees
  getLatLongExtent: function() {
    return transformExtent(this.getExtent(), "EPSG:3857", "EPSG:4326");
  },

  // Sets internal extent values after validation
  setExtent: function(extentInput) {
    var [minX, minY, maxX, maxY] = this.getExtent();
    // Check for null values
    if (extentInput[0] != null) {
      minX = extentInput[0];
    }
    if (extentInput[1] != null) {
      minY = extentInput[1];
    }
    if (extentInput[2] != null) {
      maxX = extentInput[2];
    }
    if (extentInput[3] != null) {
      maxY = extentInput[3];
    }
    // Check for inverted values
    if (minX > maxX) {
      let dummy = minX;
      minX = maxX;
      maxX = dummy;
    }
    if (minY > maxY) {
      let dummy = minY;
      minY = maxY;
      maxY = dummy;
    }
    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
  },

  // Set extent in decimal LatLong format
  setLatLongExtent: function(extentInput) {
    this.setExtent(transformExtent(extentInput, "EPSG:4326", "EPSG:3857"));
  },

  // Toggle visibility of the selectedBounds
  toggle: function() {
    if (this.enabled) {
      this.hide();
    } else {
      this.show();
    }
  },

  // TODO: put initialized gating in the show() function
  // Prep actions for selectedBound's first show()
  _initialize: function() {
    if (!this.initialized) {
      // Set initialization status
      this.initialized = true;

      // Add html for overlay corners. It's a little hacky,
      // but it works well without wasted space
      $("#viewer").append(
        ' \
                <div id="neCorner" class="boundingCorners"></div> \
                <div id="nCorner" class="boundingCorners"></div> \
                <div id="nwCorner" class="boundingCorners"></div> \
                <div id="sCorner" class="boundingCorners"></div> \
                <div id="seCorner" class="boundingCorners"></div> \
                <div id="eCorner" class="boundingCorners"></div> \
                <div id="swCorner" class="boundingCorners"></div> \
                <div id="wCorner" class="boundingCorners"></div> \
            '
      );

      // Register update events for clicking on the corners
      this._registerCornerDrag("neCorner", 2, 3);
      this._registerCornerDrag("nCorner", undefined, 3);
      this._registerCornerDrag("nwCorner", 0, 3);
      this._registerCornerDrag("sCorner", undefined, 1);
      this._registerCornerDrag("seCorner", 2, 1);
      this._registerCornerDrag("eCorner", 2, undefined);
      this._registerCornerDrag("swCorner", 0, 1);
      this._registerCornerDrag("wCorner", 0, undefined);

      // Create overlays for adjustment knobs
      this.neCorner = new Overlay({
        element: document.getElementById("neCorner"),
        positioning: "center-center"
      });
      this.nCorner = new Overlay({
        element: document.getElementById("nCorner"),
        positioning: "center-center"
      });
      this.nwCorner = new Overlay({
        element: document.getElementById("nwCorner"),
        positioning: "center-center"
      });
      this.sCorner = new Overlay({
        element: document.getElementById("sCorner"),
        positioning: "center-center"
      });
      this.seCorner = new Overlay({
        element: document.getElementById("seCorner"),
        positioning: "center-center"
      });
      this.eCorner = new Overlay({
        element: document.getElementById("eCorner"),
        positioning: "center-center"
      });
      this.swCorner = new Overlay({
        element: document.getElementById("swCorner"),
        positioning: "center-center"
      });
      this.wCorner = new Overlay({
        element: document.getElementById("wCorner"),
        positioning: "center-center"
      });

      // Calculate a default extent based on current viewport if
      // no extent has been set
      if (this.minX == null) {
        let shrinkProp = 0.8;
        let shrinkBottom = 0.4;
        let viewExtent = map.getView().calculateExtent();

        let centerX = (viewExtent[0] + viewExtent[2]) * 0.5;
        let centerY = (viewExtent[1] + viewExtent[3]) * 0.5;
        let spanX = viewExtent[2] - viewExtent[0];
        let spanY = viewExtent[3] - viewExtent[1];

        this.minX = centerX - 0.5 * shrinkProp * spanX;
        this.minY = centerY - 0.5 * shrinkBottom * spanY;
        this.maxX = centerX + 0.5 * shrinkProp * spanX;
        this.maxY = centerY + 0.5 * shrinkProp * spanY;
      }
    }
  },

  hide: function() {
    if (this.initialized) {
      // handdle control panel modifications
      let extentBox = $("#extent-box-collapsible");
      extentBox.css({
        "max-height": "0px"
      });

      // remove corners
      this.neCorner.setPosition(undefined);
      this.nCorner.setPosition(undefined);
      this.nwCorner.setPosition(undefined);
      this.sCorner.setPosition(undefined);
      this.seCorner.setPosition(undefined);
      this.eCorner.setPosition(undefined);
      this.swCorner.setPosition(undefined);
      this.wCorner.setPosition(undefined);

      // remove square
      if (this.boxLayer != null) {
        map.removeLayer(this.boxLayer);
        this.boxLayer = undefined;
      }

      // set status state
      this.enabled = false;
    }
  },

  // Function to allow dragging of the box corners
  _registerCornerDrag: function(elemName, xIndex, yIndex) {
    document
      .getElementById(elemName)
      .addEventListener("mousedown", function(evt) {
        function move(evt) {
          let dragPoint = map.getEventCoordinate(evt);
          let newExtent = new Array(4);
          newExtent[xIndex] = dragPoint[0];
          newExtent[yIndex] = dragPoint[1];
          selectedBounds.setExtent(newExtent);
          selectedBounds.show();
        }

        function end(evt) {
          updateLayer();
          window.removeEventListener("mousemove", move);
          window.removeEventListener("mouseup", end);
        }
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", end);
      });
  },

  // Display selectedBounds and prepare viewport fo interaction
  show: function() {
    // Handle control panel modifications
    let extentBox = $("#extent-box-collapsible");
    extentBox.css({
      "max-height": "100%"
    });

    // Initialize on on first show()
    // TODO: Move logic here
    this._initialize();

    // This is the inner bounding box.
    let extent = this.getExtent();

    // Set color scheme for box
    let innerStyle = new Style({
      stroke: new Stroke({
        width: 4,
        color: "#325F90" //[0, 60, 136, 1]
      }),
      fill: null
    });

    let interiorArea = new fromExtent(extent);
    let interior = new Feature(interiorArea);
    interior.setStyle(innerStyle);

    // Remove any old vector layers and insert a new one
    if (this.boxLayer != null) {
      map.removeLayer(this.boxLayer);
    }
    this.boxLayer = new VectorLayer({
      source: new VectorSource({
        features: [interior]
      })
    });

    // Update corner positions
    this.neCorner.setPosition([extent[2], extent[3]]);
    this.nCorner.setPosition([(extent[0] + extent[2]) * 0.5, extent[3]]);
    this.nwCorner.setPosition([extent[0], extent[3]]);
    this.sCorner.setPosition([(extent[0] + extent[2]) * 0.5, extent[1]]);
    this.seCorner.setPosition([extent[2], extent[1]]);
    this.eCorner.setPosition([extent[2], (extent[1] + extent[3]) * 0.5]);
    this.swCorner.setPosition([extent[0], extent[1]]);
    this.wCorner.setPosition([extent[0], (extent[1] + extent[3]) * 0.5]);

    // Display layers and overlays
    map.addLayer(this.boxLayer);

    map.updateSize();
    map.addOverlay(this.neCorner);
    map.addOverlay(this.nCorner);
    map.addOverlay(this.nwCorner);
    map.addOverlay(this.sCorner);
    map.addOverlay(this.seCorner);
    map.addOverlay(this.eCorner);
    map.addOverlay(this.swCorner);
    map.addOverlay(this.wCorner);

    // Update text inputs
    let longLatExtent = this.getLatLongExtent();
    $("#WLatLong").val(Number.parseFloat(longLatExtent[0]).toFixed(4));
    $("#SLatLong").val(Number.parseFloat(longLatExtent[1]).toFixed(4));
    $("#ELatLong").val(Number.parseFloat(longLatExtent[2]).toFixed(4));
    $("#NLatLong").val(Number.parseFloat(longLatExtent[3]).toFixed(4));

    // Change object status
    this.enabled = true;

    // Hack to fix a placement bug in OpenLayers
    fixSizeBug();
  }
};

// Hack to fix a placement bug in OpenLayers
var fixSizeBug = function() {
  setTimeout(function() {
    map.updateSize();
  }, 100);
  setTimeout(function() {
    map.updateSize();
  }, 200);
};

// Fix layout bug on launch
fixSizeBug();

// Set up text input
var setInputLatLongVals = function() {
  extent = Array(4);
  extent[0] = parseFloat($("#WLatLong").val());
  extent[1] = parseFloat($("#SLatLong").val());
  extent[2] = parseFloat($("#ELatLong").val());
  extent[3] = parseFloat($("#NLatLong").val());
  selectedBounds.setLatLongExtent(extent);
  selectedBounds.show();
};

// Update map on pressing enter
var checkLatLongForEnter = function(event) {
  if (event.key === "Enter") {
    setInputLatLongVals();
  }
};

$("#NLatLong").on("blur", setInputLatLongVals);
$("#SLatLong").on("blur", setInputLatLongVals);
$("#ELatLong").on("blur", setInputLatLongVals);
$("#WLatLong").on("blur", setInputLatLongVals);

$("#NLatLong").on("keydown", checkLatLongForEnter);
$("#SLatLong").on("keydown", checkLatLongForEnter);
$("#ELatLong").on("keydown", checkLatLongForEnter);
$("#WLatLong").on("keydown", checkLatLongForEnter);

$(document).bind(
  "webkitfullscreenchange mozfullscreenchange fullscreenchange",
  function(e) {
    fullScreen =
      document.fullScreen ||
      document.mozFullScreen ||
      document.webkitIsFullScreen;
    if (fullScreen) {
      $('[class*="col-"]').css({
        height: "100%"
      });
    } else {
      $('[class*="col-"]').css({
        height: "96vh"
      });
    }
    fixSizeBug();
  }
);

function radioLayerUpdate() {
  let radioVal = $("input[name='layer']:checked").val();
  var overallBox = $("#overall-layer-options");
  var independentBox = $("#independent-layer-options");
  var outputBox = $("#output-layer-options");
  overallBox.css({
    "max-height": "0px",
    display: "none"
  });
  independentBox.css({
    "max-height": "0px",
    display: "none"
  });
  outputBox.css({
    "max-height": "0px",
    display: "none"
  });
  if (radioVal == "tradeoff") {
    window.displayMode = window.currentTradeoffChoice;
    overallBox.css({
      "max-height": "100%",
      display: "block"
    });
    updateLayer();
  }

  if (radioVal == "ind") {
    independentBox.css({
      "max-height": "100%",
      display: "block"
    });
    window.currentLayer = window.independentLayer;
    window.displayMode = "single";
    updateLayer();
  }

  if (radioVal == "out") {
    outputBox.css({
      "max-height": "100%",
      display: "block"
    });
    window.currentLayer = window.outLayer;
    window.displayMode = "single";
    updateLayer();
  }
}

function radioBaseUpdate() {
  let radioVal = $("input[name='base']:checked").val();
  map.removeLayer(satLayer);
  map.removeLayer(streetLayer);
  map.removeLayer(topoLayer);
  if (radioVal == "sat") {
    map.getLayers().insertAt(0, satLayer);
  } else if (radioVal == "street") {
    map.getLayers().insertAt(0, streetLayer);
  } else if (radioVal == "topo") {
    map.getLayers().insertAt(0, topoLayer);
  }
}

// Calls functions on layer updates
$("input[type=radio][name=layer]").change(radioLayerUpdate);
$("input[type=radio][name=base]").change(radioBaseUpdate);

radioLayerUpdate();
radioBaseUpdate();

$(function() {
  var handle = $("#custom-handle");
  $("#slider").slider({
    min: 10,
    max: 90,
    step: 10,
    value: 50,
    create: function() {
      handle.text($(this).slider("value") + "%");
    },
    slide: function(event, ui) {
      handle.text(ui.value + "%");
    }
  });
});

// Define selection of individual map tiles, and set up popup
var selectStyle = function(feature) {
  var rank = feature.getProperties()[window.currentLayer];
  if (shouldShowFeature(feature)) {
    var color = colorRankInterpolate(rank);
    return new Style({
      fill: new Fill({
        color: color
      }),
      stroke: new Stroke({
        color: [0, 0, 0],
        width: 2
      })
    });
  } else {
    return new Style({
      fill: null,
      stroke: null
    });
  }
};

var select = new Select({
  style: selectStyle
});
map.addInteraction(select);
select.on("select", function(e) {
  var features = e.target.getFeatures().getArray();
  if (features.length == 1 && shouldShowFeature(features[0])) {
    let feature = features[0];
    let extent = feature.getGeometry().getExtent();
    var featureValues = feature.getProperties();
    let center = getCenter(extent);
    let content = $("<p>");
    let lonLat = toLonLat(center);
    let lon = lonLat[0].toFixed(3);
    let lat = lonLat[1].toFixed(3);
    content.append(
      "<span><b>Position:</b> " + lon + "°E, " + lat + "°N</span><br>"
    );
    content.append(
      "<span><b>Town:</b> " +
        window.metadata.towns[featureValues.t].nickname +
        "</span><br>"
    );
    content.append(
      "<span><b>COG:</b> " +
        window.metadata.cogs[featureValues.c].nickname +
        "</span><br>"
    );
    content.append(
      "<span><b>Rank:</b> " + getRankValue(feature) + "</span><br>"
    );
    $("#popup-content").html(content);
    popupOverlay.setPosition(center);
  } else {
    closePopup();
  }
});

$("#popup-closer").click(closePopup);

var scaleBarSteps = 4;
var scaleBarText = true;
var control;
// document.body.style.cursor = "progress";

function scaleControl(units) {
  control = new ScaleLine({
    units: units,
    bar: true,
    steps: scaleBarSteps,
    text: scaleBarText,
    minWidth: 140
  });
  return control;
}
// map.addControl(scaleControl("metric"));
// map.addControl(scaleControl("us"));

// document.body.style.cursor = "progress";

// toJpeg(map.getViewport(), exportOptions).then(function(dataUrl) {
//   var pdf = new jsPDF("landscape", undefined, format);
// pdf.addImage(dataUrl, "JPEG", 0, 0, dim[0], dim[1]);
//   pdf.save("map.pdf");
//   // Reset original map size
//   map.setSize(size);
//   map.getView().setResolution(viewResolution);
//   exportButton.disabled = false;
//   document.body.style.cursor = "auto";
// });

var exportOptions = {
  filter: function(element) {
    return true;
    // return element.className.indexOf("ol-control") === -1;
  }
};

// var format = document.getElementById('format').value;
// var resolution = document.getElementById('resolution').value;
var resolution = 150;
var dim = [594, 420];
var width = Math.round((dim[0] * resolution) / 25.4);
var height = Math.round((dim[1] * resolution) / 25.4);
var size = map.getSize();
var viewResolution = map.getView().getResolution();

window.fire = function() {
  updateLayer();
  // Set print size
  var printSize = [width, height];
  map.setSize(printSize);
  var scaling = Math.min(width / size[0], height / size[1]);
  map.getView().setResolution(viewResolution / scaling);
  map.once("rendercomplete", function() {
    exportOptions.width = width;
    exportOptions.height = height;
    toJpeg(map.getViewport(), exportOptions).then(function(dataUrl) {
      var pdf = new jsPDF("landscape", undefined, "A2");
      pdf.addImage(dataUrl, "JPEG", 0, 0, dim[0], dim[1]);
      pdf.save("map.pdf");
      // Reset original map size
      map.setSize(size);
      map.getView().setResolution(viewResolution);
      // exportButton.disabled = false;
      document.body.style.cursor = "auto";
      console.log("Ok ok");
    });
  });
};

var tradeoffPicker = $("#tradeoff-picker");
$(tradeoffPicker).combobox({
  label: "Select a tradeoff to explore.",
  select: function(event, ui) {
    updateTradeoffSelection(ui.item.value);
  }
});

window.currentTradeoffChoice = tradeoffPicker
  .children()
  .first()
  .val();
updateTradeoffSelection(window.currentTradeoffChoice);

function updateTradeoffSelection(tradeoffVal) {
  let stressorBox = $("#stressor-options");
  let enviroSocialBox = $("#enviro-social-options");
  let ExSenAdBox = $("#ExSenAd-options");
  window.currentTradeoffChoice = tradeoffVal;

  stressorBox.css({
    "max-height": "0px",
    display: "none"
  });
  enviroSocialBox.css({
    "max-height": "0px",
    display: "none"
  });
  ExSenAdBox.css({
    "max-height": "0px",
    display: "none"
  });
  if ($("input[name='layer']:checked").val() == "tradeoff") {
    if (tradeoffVal == "stressors") {
      window.displayMode = "stressors";
      stressorBox.css({
        "max-height": "100%",
        display: "block"
      });
    } else if (tradeoffVal == "enviro-social") {
      window.displayMode = "enviro-social";
      enviroSocialBox.css({
        "max-height": "100%",
        display: "block"
      });
    } else if (tradeoffVal == "ExSenAd") {
      window.displayMode = "ExSenAd";
      ExSenAdBox.css({
        "max-height": "100%",
        display: "block"
      });
    }
    updateLayer();
  }
}

$("#stressor-slider").prop_slider({
  left: "Physical Stressors",
  right: "Coastal Stressors",
  callback: function(value) {
    window.physical_coastal = value;
    updateLayer();
  }
});

$("#enviro-social-slider").prop_slider({
  left: "Natural Habitat",
  right: "Social Exposure",
  callback: function(value) {
    window.enviro_social = value;
    updateLayer();
  }
});

$("#exposure-slider").prop_slider({
  left: "",
  right: "Exposure",
  min: 10,
  max: 100,
  labelWidth: "auto",
  callback: function(value) {
    window.exposureCoef = value;
    updateLayer();
  }
});

$("#sensitivity-slider").prop_slider({
  left: "",
  right: "Sensitivity",
  min: 10,
  max: 100,
  labelWidth: "auto",
  callback: function(value) {
    window.sensitivityCoef = value;
    updateLayer();
  }
});

$("#adaptivity-slider").prop_slider({
  left: "",
  right: "Adaptive Capacity",
  min: 10,
  max: 100,
  labelWidth: "auto",
  callback: function(value) {
    window.adaptivityCoef = value;
    updateLayer();
  }
});
