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
    value = selected.val() ? selected.text() : "";

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
        var text = $(this).text();
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
    // callback: function () {return true},
  },

  _create: function() {
    this.element.addClass("slider-container");
    var bar_container = $("<div>", {
      class: "slider-bar-container"
    });
    bar_container.appendTo(this.element);

    var slider_bar = $("<div>", {});
    var slider_bar_handle = $("<div>", {
      class: "slider-handle ui-slider-handle"
    });

    // callback(this.options.value);

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
        // callback(ui.value);
      }
    });
    slider_bar.appendTo(bar_container);

    var labels_container = $("<div>", {
      class: "slider-labels"
    });

    var left_label = $("<span>", {
      class: "slider-left-label",
      text: this.options.left
    });

    var right_label = $("<span>", {
      class: "slider-right-label",
      text: this.options.right
    });

    labels_container.append(left_label).append(right_label);
    labels_container.appendTo(this.element);
  }
});

$("#environment-man-slider").prop_slider({
  left: "People",
  right: "Environment"
});

$("#thing-slider").prop_slider({
  left: "Thing",
  right: "Other Thing"
});

// $("#trans-slider").prop_slider({
//   left: "More Transparent",
//   right: "Less Transparent",
//   min: 0,
//   max: 100,
//   step: 20,
//   value: 70,
//   // callback: function(trans) {window.trans = trans},
// });

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
