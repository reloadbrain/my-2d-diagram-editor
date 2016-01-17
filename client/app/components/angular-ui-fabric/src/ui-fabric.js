(function() {

  'use strict';

  /*
   * Declare a new module called 'ui.fabric', and list its dependencies.
   * Modules serve as containers to help you organise code within your AngularJS application.
   * Modules can contain sub-modules, making it easy to compose functionality as needed.
   */

  angular.module('ui.fabric', [])
    .factory('fabric', fabric);

  /*
   * Use $inject to manually identify your dependencies for Angular components.
   * This technique mirrors the technique used by ng-annotate, for automating the creation of minification safe
   * dependencies. If ng-annotate detects injection has already been made, it will not duplicate it.
   */

  fabric.$inject = ['$log', 'fabricCanvas', 'fabricService', 'fabricWindow', 'fabricShape', 'fabricText'];

  function fabric($log, fabricCanvas, fabricService, fabricWindow, fabricShape, fabricText) {

    var service = this;

    service.canvas = null;

    service.canvasDefaults = null;
    service.controlDefaults = null;
    service.rectDefaults = null;
    service.triangleDefaults = null;
    service.lineDefaults = null;

    service.verticalGridLinesGroup = {};
    service.horizontalGridLinesGroup = {};
    service.verticalGridLines = [];
    service.horizontalGridLines = [];

    service.connectorMode = false;

    service.activeObject = null;
    service.selectedObject = null;

    service.connectorLine = null;
    service.isMouseDown = false;
    service.fromObject = null;

    $log.info('fabric');

    service.init = function () {

      $log.info('fabric - init()');

      service.canvasDefaults = fabricService.getCanvasDefaults();
      service.controlDefaults = fabricService.getControlDefaults();
      service.rectDefaults = fabricService.getRectDefaults();
      service.triangleDefaults = fabricService.getTriangleDefaults();
      service.lineDefaults = fabricService.getLineDefaults();
    };

    service.setConnectorMode = function (mode) {

      $log.info('fabric - setConnectorMode(): ' + mode);

      service.connectorMode = mode;
      service.canvas.selection = !mode;
    };

    //
    // Canvas
    //

    service.getCanvas = function () {

      $log.info('fabric - getCanvas()');

      service.canvas = fabricCanvas.getCanvas();
      service.configCanvasListeners();

      return service.canvas;
    };

    //
    // Grid
    //

    service.showGrid = function() {

      $log.info('fabric - showGrid()');

      var grid = service.canvasDefaults.grid.size;
      var width = service.canvasDefaults.width;
      var height = service.canvasDefaults.height;

      // $log.info('width: ' + service.canvasDefaults.width);
      // $log.info('height: ' + service.canvasDefaults.height);

      // draw the Vertical lines
      var i = 0;
      for (var x = 0.5; x < width; x += grid) {
        service.verticalGridLines[i++] = fabricShape.gridLine([ x, 0.5, x, width],
          { stroke: '#ccc', selectable: false });
      }

      // draw the Horizontal lines
      i = 0;
      for (var y = 0.5; y < height; y += grid) {
        service.horizontalGridLines[i++] = fabricShape.gridLine([ 0.5, y, height, y],
          { stroke: '#ccc', selectable: false });
      }

      service.verticalGridLinesGroup = service.createGroup(service.verticalGridLines,
        { selectable: false }, false);
      service.verticalGridLinesGroup.sendToBack();
      service.horizontalGridLinesGroup = service.createGroup(service.horizontalGridLines,
        { selectable: false }, false);
      service.horizontalGridLinesGroup.sendToBack();

      // Why did we start x and y at 0.5? Why not 0?
      // See: http://diveintohtml5.info/canvas.html

      $log.info('fabric - showGrid() - deactivateAll().renderAll()');
      service.canvas.deactivateAll().renderAll();
    };

    service.hideGrid = function() {

      $log.info('fabric - hideGrid()');

      service.removeGroup(service.verticalGridLinesGroup, false);
      service.removeGroup(service.horizontalGridLinesGroup, true);
    };

    //
    // Shapes
    //

    var addObjectToCanvas = function(object, render) {

      render = render || false;

      if (service.canvas === null) {
        $log.error('You must call getCanvas() before you try to add shapes to a canvas.');
        service.getCanvas();
      }

      service.canvas.add(object);
      // service.setObjectZoom(object);
      // service.canvas.setActiveObject(object);
      object.bringToFront();

      $log.info('fabric - addObjectToCanvas() - render: ' + render.toLocaleString());

      if (render !== false) {
        $log.info('fabric - addObjectToCanvas() - renderAll');
        service.canvas.renderAll();
      }

      return object;
    };

    var removeObjectFromCanvas = function(object, render) {

      service.canvas.remove(object);

      $log.info('fabric - removeObjectFromCanvas() - render: ' + render.toLocaleString());

      if (render) {
        $log.info('fabric - removeObjectFromCanvas() - renderAll');
        service.canvas.renderAll();
      }
    };

    service.removeActiveObjectFromCanvas = function() {

      $log.info('fabric - removeActiveObjectFromCanvas()');

      var object = service.canvas.getActiveObject();
      service.canvas.remove(object);
      service.canvas.renderAll();
    };

    //
    // Rect
    //

    /**
     * @name addRect
     * @desc Creates a new Rect and adds it to the canvas
     * @param {Object} [options] A configuration object, defaults to FabricConstants.rectDefaults
     * @return {Object} Returns the new Rect object
     */
    service.addRect = function(options, render) {

      $log.info('fabric - addRect()');

      return addObjectToCanvas(fabricShape.rect(options), render);
    };

    //
    // Triangle
    //

    service.addTriangle = function(options, render) {

      $log.info('fabric - addTriangle()');

      return addObjectToCanvas(fabricShape.triangle(options), render);
    };


    //
    // Line
    //

    service.addLine = function(points, options, render) {

      $log.info('fabric - addLine()');

      return addObjectToCanvas(fabricShape.line(points, options), render);
    };

    //
    // Text
    //

    service.addText = function(text, options, render) {

      $log.info('fabric - addText()');

      return addObjectToCanvas(fabricText.text(text, options), render);
    };

    //
    // Groups
    //

    service.createGroup = function(objects, options, render) {

      $log.info('fabric - createGroup()');

      var object = new fabricWindow.Group(objects, options);

      $log.info('fabric - createGroup() - render: ' + render.toLocaleString());

      return addObjectToCanvas(object, render);
    };

    service.removeGroup = function(object, render) {
      $log.info('fabric - removeGroup()');
      removeObjectFromCanvas(object, render);
    };

    //
    // Grid
    //

    service.toggleSnapToGrid = function() {
      service.canvasDefaults.grid.snapTo = !service.canvasDefaults.grid.snapTo;
    };

    //
    // Create Arrow Head
    //

    var createArrowHead = function(points) {

      var x1 = points[0];
      var y1 = points[1];
      var x2 = points[2];
      var y2 = points[3];

      // $log.info('createArrowHead - points: ' + JSON.stringify(['e', points], null, '\t'));

      var dx = x2 - x1;
      var dy = y2 - y1;

      var angle = Math.atan2(dy, dx);
      angle *= 180 / Math.PI;
      angle += 90;

      var options = service.triangleDefaults;
      options.angle = angle;
      options.top = y2;
      options.left = x2;
      options.selectable = false;

      service.addTriangle(options);
    };

    //
    // Listeners
    //

    service.configCanvasListeners = function() {

      //
      // Object - Snap to grid
      //

      service.canvas.on('object:moving', function(options) {

        // $log.info('object:moving');

        var object = options.target;
        var objectCenter = object.getCenterPoint();

        // update Connectors
        if (object.connectors) {

          if (object.connectors.from) {
            object.connectors.from.forEach(function (line) {
              // $log.info('object:moving - object.connectors.from.forEach');
              line.set({'x1': objectCenter.x, 'y1': objectCenter.y});
            });
          }

          if (object.connectors.to) {
            object.connectors.to.forEach(function (line) {
              // $log.info('object:moving - object.connectors.to.forEach');
              line.set({'x2': objectCenter.x, 'y2': objectCenter.y});
            });
          }

          service.canvas.renderAll();
        }

        if (service.canvasDefaults.grid.snapTo) {

          options.target.set({
            left: Math.round(options.target.left /
            service.canvasDefaults.grid.size) * service.canvasDefaults.grid.size,
            top: Math.round(options.target.top /
            service.canvasDefaults.grid.size) * service.canvasDefaults.grid.size
          });
        }

      });

      //
      // Mouse
      //

      service.canvas.on('mouse:down', function(object){

        // $log.info('mouse:down');

        if (service.connectorMode) {

          if (service.selectedObject) {

            service.isMouseDown = true;

            service.fromObject = service.selectedObject;

            var objectCenter = service.fromObject.getCenterPoint();
            var points = [ objectCenter.x, objectCenter.y, objectCenter.x, objectCenter.y ];

            var options = service.lineDefaults;
            options.selectable = false;
            options.strokeWidth = 2;

            service.connectorLine = service.addLine(points, options);
          }
        }

      });

      service.canvas.on('mouse:move', function(object){

        // $log.info('mouse:move');

        if (!service.isMouseDown) return;

        if (service.connectorMode) {

          var pointer = service.canvas.getPointer(object.e);
          service.connectorLine.set({ x2: pointer.x, y2: pointer.y });

          service.canvas.renderAll();
        }

      });

      service.canvas.on('mouse:up', function(){

        // $log.info('mouse:up');

        if (service.connectorMode) {

          service.isMouseDown = false;

          if (service.selectedObject) {

            var objectCenter = service.selectedObject.getCenterPoint();

            service.connectorLine.set({ x2: objectCenter.x, y2: objectCenter.y });

            service.fromObject.connectors.from.push(service.connectorLine);
            service.selectedObject.connectors.to.push(service.connectorLine);

            createArrowHead([service.connectorLine.left, service.connectorLine.top,
              objectCenter.x, objectCenter.y]);
            createArrowHead([objectCenter.x, objectCenter.y,
              service.connectorLine.left, service.connectorLine.top]);

            service.connectorLine = null;

          } else {

            if (service.connectorLine) {

              $log.info('mouse:up - removeObjectFromCanvas()');

              removeObjectFromCanvas(service.connectorLine, false);
            }
          }

          service.canvas.renderAll();
        }

      });

      service.canvas.on('mouse:over', function(element) {

        // $log.info('mouse:over');

        if (service.connectorMode) {

          if (element.target.type === 'node') {

            service.selectedObject = element.target;

            if (!service.activeObject) {
              service.activeObject = service.canvas.getActiveObject();
            }

            if (service.activeObject) {
              service.activeObject.set('active', false);
            }

            service.selectedObject.set('active', true);
            service.selectedObject.set('selectable', false);
            service.selectedObject.set('hasRotatingPoint', false);
            // service.selectedObject.set('cornerColor', 'green');
            service.selectedObject.set('hasBorders', false);
            service.selectedObject.set('cornerSize', 10);
            service.selectedObject.set('transparentCorners', false);
            service.selectedObject.setControlsVisibility({ tl: false, tr: false, br: false, bl: false });

            service.canvas.renderAll();
          }
        }
      });

      service.canvas.on('mouse:out', function(element) {

        // $log.info('mouse:out');

        if (service.connectorMode) {

          if (element.target.type === 'node') {

            if (service.selectedObject) {

              service.selectedObject.set('active', false);
              service.selectedObject.set('selectable', true);
              service.selectedObject.set('hasRotatingPoint', true);
              // service.selectedObject.set('cornerColor', service.rectDefaults.cornerColor);
              service.selectedObject.set('hasBorders', service.rectDefaults.hasBorders);
              service.selectedObject.set('cornerSize', service.rectDefaults.cornerSize);
              service.selectedObject.set('transparentCorners', service.rectDefaults.transparentCorners);
              service.selectedObject.setControlsVisibility({ tl: true, tr: true, br: true, bl: true });

              service.selectedObject = null;

              if (service.activeObject) {
                service.activeObject.set('active', true);
                service.canvas._activeObject = service.activeObject;
              }

              service.canvas.renderAll();
            }
          }
        }
      });


      service.canvas.on('object:selected', function(element) {

        $log.info('object:selected');

        if (service.connectorMode) {

          if (element.target.type === 'node') {

            $log.info('object:selected - element.target.type === node');

            service.selectedObject = element.target;
            service.activeObject = service.selectedObject;
            service.selectedObject.set('selectable', true);
            service.selectedObject.set('hasRotatingPoint', true);
            // service.selectedObject.set('cornerColor', service.rectDefaults.cornerColor);
            service.selectedObject.set('hasBorders', service.rectDefaults.hasBorders);
            service.selectedObject.set('cornerSize', service.rectDefaults.cornerSize);
            service.selectedObject.set('transparentCorners', service.rectDefaults.transparentCorners);
            service.selectedObject.setControlsVisibility({ tl: true, tr: true, br: true, bl: true });

            service.canvas.renderAll();
          }
        }
      });

      service.canvas.on('selection:cleared', function(element) {
        $log.info('selection:cleared');
        service.activeObject = null;
      });

    };

    service.init();

    return service;

  }

})();

/*

 // add a reference to the line to each object
 service.fromObject.addChild = {
 // this retains the existing arrays (if there were any)
 from: (service.fromObject.addChild && service.fromObject.addChild.from),
 to: (service.fromObject.addChild && service.fromObject.addChild.to)
 };

 // var pointer = service.canvas.getPointer(object.e);
 // var points = [ pointer.x, pointer.y, pointer.x, pointer.y ];

 // $log.info('mouse:down - points: ' + points.toLocaleString());

 // canvas.item(canvas._objects.length-1).set('active',true);

 // canvas.setActiveObject(canvas._objects[canvas._objects.length-1]);

 var object = element.target;

 object.set('hasRotatingPoint', true);
 object.setControlsVisibility({
 tl: true,
 tr: true,
 br: true,
 bl: true
 });

 // service.selectedObject.lockUniScaling = true; you only get the corners


 // var rectDefaults = angular.copy(fabricService.getRectDefaults());
 // var objectControls = null;
 // const LINE_WIDTH = 1;

 service.objectControls = false;
 service.controlDefaults = null;
 service.controlsGroup = {};
 service.controlLines = [];

 // $log.info('element: ' + JSON.stringify(['e', element], null, '\t'));

 // drawControls(element);

 // eraseControls(element);

//
// Controls
//

var drawControls = function(element) {
  drawObjectControls(element);
};

var eraseControls = function(element) {
  eraseObjectControls(element);
};

var drawObjectControls = function(element) {

  $log.info('fabric - drawObjectControls()');

  $log.info('element: ' + JSON.stringify(['e', element], null, '\t'));

  if (service.objectControls === false) {

    $log.info('service.objectControls === false');

    var topLeft = {x: element.target.left - 2, y: element.target.top - 2};
    var topRight = {x: element.target.top + element.target.width, y: element.target.top - 2};
    var bottomLeft = {x: element.target.left - 2, y: element.target.top + element.target.height};
    var bottomRight = {x: element.target.top + element.target.width, y: element.target.top + element.target.height};

    var i = 0;
    service.controlLines[i++] = fabricShape.line([ topLeft.x, topLeft.y, topRight.x, topRight.y],
      service.controlDefaults);
    service.controlLines[i++] = fabricShape.line([ topRight.x, topRight.y, bottomRight.x, bottomRight.y],
      service.controlDefaults);
    service.controlLines[i++] = fabricShape.line([ bottomRight.x, bottomRight.y, bottomLeft.x, bottomLeft.y],
      service.controlDefaults);
    service.controlLines[i++] = fabricShape.line([ bottomLeft.x, bottomLeft.y, topLeft.x, topLeft.y],
      service.controlDefaults);

    service.controlsGroup = service.createGroup(service.controlLines, { selectable: false }, false);

    service.objectControls = true;

    // top-left
    // top-right
    // bottom-left
    // bottom-right

  }

};

var eraseObjectControls = function(element) {

  $log.info('fabric - eraseObjectControls()');

  if (service.objectControls === true) {

    $log.info('service.objectControls === true');

    service.removeGroup(service.controlsGroup, true)

    service.objectControls = false;
  }
};

 // element.target.setFill('red');
 // service.canvas.renderAll();


 // element.target.setFill('green');
 // service.canvas.renderAll();

 rectDefaults.strokeWidth = 5;

 rectDefaults.left = element.target.left - (rectDefaults.strokeWidth + 1);
 rectDefaults.top = element.target.top - (rectDefaults.strokeWidth + 1);
 rectDefaults.width = element.target.width + (2 * rectDefaults.strokeWidth);
 rectDefaults.height = element.target.height + (2 * rectDefaults.strokeWidth);
 rectDefaults.fill = 'none';
 rectDefaults.stroke = 'rgba(100,200,200,0.5)';
 rectDefaults.opacity = 0.5;

 // $log.info('rectDefaults: ' + JSON.stringify(['e', rectDefaults], null, '\t'));

 objectControls = service.addRect(rectDefaults, false);

if (object.left === canvasDefaults.grid.size || object.top === canvasDefaults.grid.size) {
  $log.info('fabric - addObjectToCanvas() - centerObject()');
  fabricWindow.centerObject();
}

// $log.info('mouse:over - element.target: ' + JSON.stringify(['e', element.target], null, '\t'));

 rectDefaults.left = 50 - (rectDefaults.strokeWidth + 1);
 rectDefaults.top = 50 - (rectDefaults.strokeWidth + 1);
 rectDefaults.width = 300 + (2 * rectDefaults.strokeWidth);
 rectDefaults.height = 300 + (2 * rectDefaults.strokeWidth);

 var activeGroup = this.getActiveGroup();

 if (activeGroup) {
 drawGroupControls();
 } else {
 drawObjectControls();
 }

 */
