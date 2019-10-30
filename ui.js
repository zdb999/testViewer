import { makeColorScale } from "./colorbar";

$.widget("custom.colorbox", {
  options: {
    data: ["Yes", "No"],
    label: "Set Color Scheme",
    callback: function() {}
  },

  _create: function() {
    var menuShown = false;
    var callback = this.options.callback;
    this.wrapper = $("<div>")
      .addClass("color-box custom-combobox")
      .insertAfter(this.element);
    this.element.hide();
    var input = $("<div>")
      .addClass(
        "custom-combobox-input ui-widget ui-widget-content ui-autocomplete-input"
      )
      .appendTo(this.wrapper);

    var currentBar = $("<div>");
    input.append(currentBar);
    makeColorScale(currentBar[0], window.colorScheme, "100%", 20);

    this.dropdownButton = $("<a>")
      .button({
        icons: {
          primary: "ui-icon-triangle-1-s"
        },
        text: false
      })
      .removeClass("ui-corner-all")
      .addClass("custom-combobox-toggle ui-corner-right")
      .tooltip()
      .attr("role", "button")
      .on("click", toggle)
      .on("blur", collapse)
      .appendTo(this.wrapper);

    function collapse() {
      menu.hide();
      menuShown = false;
    }
    function toggle() {
      if (menuShown) {
        collapse();
      } else {
        menu.show().position({
          of: input,
          my: "left top",
          at: "left bottom",
          collision: "none"
        });
        menuShown = true;
      }
    }

    var menu = $("<ul>");
    this.options.data.forEach(function(element, index) {
      let bar = $("<div>").appendTo(menu);
      makeColorScale(bar[0], element, 180, 20);
      bar.data("scheme", element);
      bar.attr("alt", element.name).click(function() {
        collapse();
        let colorScheme = $(this).data("scheme");
        currentBar.html("");
        makeColorScale(currentBar[0], colorScheme, "100%", 20);
        callback(colorScheme, window.colorScheme.transparency);
      });
    });

    menu.menu();
    menu.addClass("color-menu ui-autocomplete").hide();
    menu.appendTo(this.wrapper);
  }
});

$.widget("custom.combobox", {
  options: {
    label: "Thing"
  },

  _create: function() {
    this.wrapper = $("<div>")
      .addClass("custom-combobox")
      .insertAfter(this.element);
    this.element.hide();
    this._createAutocomplete();
    this._createShowAllButton();
  },

  _createAutocomplete: function() {
    var selected = this.element.children(":selected");
    var value = selected.val() ? selected.text() : "";

    this.input = $("<input>")
      .appendTo(this.wrapper)
      .val(value)
      .attr("title", "")
      .focus(function() {
        this.currentVal = $(this).val();
        $(this).val("");
      })
      .blur(function() {
        if ($(this).val() == "") {
          $(this).val(this.currentVal);
        }
      })
      .addClass("custom-combobox-input ui-widget ui-widget-content")
      .autocomplete({
        delay: 0,
        minLength: 0,
        source: $.proxy(this, "_source")
      })
      .tooltip({
        classes: {
          "ui-tooltip": "ui-state-highlight"
        }
      });

    this._on(this.input, {
      autocompleteselect: function(event, ui) {
        ui.item.option.selected = true;
        this._trigger("select", event, {
          type: ui.item.type,
          value: ui.item.option.value,
          item: ui.item.option
        });
      },

      autocompletechange: "_removeIfInvalid"
    });
  },

  _createShowAllButton: function() {
    var input = this.input,
      wasOpen = false;

    $("<a>")
      .attr("tabIndex", -1)
      .attr("title", this.options.label)
      .tooltip()
      .appendTo(this.wrapper)
      .button({
        icons: {
          primary: "ui-icon-triangle-1-s"
        },
        text: false
      })
      .removeClass("ui-corner-all")
      .addClass("custom-combobox-toggle ui-corner-right")
      .on("mousedown", function() {
        wasOpen = input.autocomplete("widget").is(":visible");
      })
      .on("click", function() {
        input.trigger("focus");

        // Close if already visible
        if (wasOpen) {
          return;
        }

        // Pass empty string as value to search for, displaying all results
        input.autocomplete("search", "");
      });
  },

  _source: function(request, response) {
    var matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), "i");
    response(
      this.element.children("option").map(function() {
        var text = $(this).html();
        var type = $(this).data("type");
        if (this.value && (!request.term || matcher.test(text)))
          return {
            type: type,
            label: text,
            value: text,
            option: this
          };
      })
    );
  },

  _removeIfInvalid: function(event, ui) {
    // Selected an item, nothing to do
    if (ui.item) {
      return;
    }

    // Search for a match (case-insensitive)
    var value = this.input.val(),
      valueLowerCase = value.toLowerCase(),
      valid = false;
    this.element.children("option").each(function() {
      if (
        $(this)
          .text()
          .toLowerCase() === valueLowerCase
      ) {
        this.selected = valid = true;
        return false;
      }
    });

    // Found a match, nothing to do
    if (valid) {
      return;
    }

    // Remove invalid value
    this.input
      .val("Custom extent")
      .attr("title", value + " didn't match any item")
      .tooltip("open");
    this.element.val("");
    this._delay(function() {
      this.input.tooltip("close").attr("title", "");
    }, 2500);
    this.input.autocomplete("instance").term = "";
  },

  _destroy: function() {
    this.wrapper.remove();
    this.element.show();
  }
});

$.widget("custom.prop_slider", {
  options: {
    left: "Option 1",
    right: "Option 2",
    min: 10,
    max: 90,
    step: 10,
    value: 50,
    labelWidth: "10ch",
    callback: function(value) {
      return true;
    }
  },

  _create: function() {
    var callback = this.options.callback;
    callback(this.options.value / 100);
    this.element.addClass("slider-container");
    var bar_container = $("<div>", {
      class: "slider-bar-container"
    });
    bar_container.appendTo(this.element);

    var slider_bar = $("<div>", {});
    var slider_bar_handle = $("<div>", {
      class: "slider-handle ui-slider-handle"
    });

    slider_bar.append(slider_bar_handle);
    slider_bar.slider({
      min: this.options.min,
      max: this.options.max,
      step: this.options.step,
      value: this.options.value,
      create: function() {
        slider_bar_handle.text($(this).slider("value") + "%");
      },
      slide: function(event, ui) {
        slider_bar_handle.text(ui.value + "%");
      },
      stop: function(event, ui) {
        callback(ui.value / 100);
      }
    });
    slider_bar.appendTo(bar_container);

    var labels_container = $("<div>", {
      class: "slider-labels"
    });

    var left_label = $("<span>", {
      class: "slider-label slider-left-label",
      text: this.options.left
    }).css("width", this.options.labelWidth);

    var right_label = $("<span>", {
      class: "slider-label slider-right-label",
      text: this.options.right
    }).css("width", this.options.labelWidth);

    labels_container.append(left_label).append(right_label);
    labels_container.appendTo(this.element);
  }
});



// Function to adjust screen arrangement for mobile
// iff device has a small screen
var checkArrangement = function() {
  if ($(window).width() > 1100) {
    $("#col-control").insertBefore("#col-map");
    $("#col-control").css("width", "20%");
    $("#col-info").css("width", "20%");
    $(".viewer").css("flex-direction", "row");
  } else {
    $("#col-control").insertAfter("#col-map");
    $("#col-control").css("width", "100%");
    $("#col-info").css("width", "100%");
    $(".viewer").css("flex-direction", "column");
  }
};

// Check arrangement on load, thus native CSS is superfluous here
window.onload = checkArrangement;
// Check again on every resize of the viewport
window.addEventListener("resize", checkArrangement);
