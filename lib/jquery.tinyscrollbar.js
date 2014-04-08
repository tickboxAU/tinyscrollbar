;(function (factory)
  {
      if (typeof define === 'function' && define.amd)
      {
          define(jQuery || ['jquery'], factory);
      }
      else if (typeof exports === 'object')
      {
          factory(jQuery || require('jquery'));
      }
      else
      {
          factory(jQuery);
      }
  }
  (function ($)
   {
       "use strict";

       var pluginName = "tinyscrollbar"
       ,   defaults   =
           {
               axis                : 'y',    // Vertical or horizontal scrollbar? ( x || y ).
               wheel               : true,   // Enable or disable the mousewheel;
               wheelSpeed          : 40,     // How many pixels must the mouswheel scroll at a time.
               wheelLock           : true,   // Lock default scrolling window when there is no more content.
               scrollInvert        : false,  // Enable invert style scrolling
               nativeScrollOnTouch : true    // Scroll natively on touch devices
           }
       ;

       function Plugin($container, options)
       {
           this.options   = $.extend({}, defaults, options);
           this._defaults = defaults;
           this._name     = pluginName;

           var self        = this
           ,   $viewport   = $container.find(".viewport")
           ,   $overview   = $container.find(".overview")

           ,   axis        = this.options.axis
           
           ,   mousePosition      = 0
           ,   oldContentPosition = 0

           ,   isHorizontal   = axis === 'x'
           ,   hasTouchEvents = "ontouchstart" in document.documentElement

           ,   sizeLabel = isHorizontal ? "width" : "height"
           ,   posiLabel = isHorizontal ? "left" : "top"
           ,   scrollNatively = this.options.nativeScrollOnTouch && hasTouchEvents
           ;

           this.contentPosition = 0;
           this.viewportSize    = 0;
           this.contentSize     = 0;
           this.contentRatio    = 0;

           function initialize()
           {
               self.update();
               setEvents();

               return self;
           }

           this.update = function(scrollTo)
           {
               var sizeLabelCap  = sizeLabel.charAt(0).toUpperCase() + sizeLabel.slice(1).toLowerCase();
               this.viewportSize = $viewport[0]['offset'+ sizeLabelCap];
               this.contentSize  = $overview[0]['scroll'+ sizeLabelCap];
               this.contentRatio = this.viewportSize / this.contentSize;

               switch (scrollTo)
               {
               case "bottom":
                   this.contentPosition = this.contentSize - this.viewportSize;
                   break;

               case "relative":
                   this.contentPosition = Math.min(this.contentSize - this.viewportSize, Math.max(0, this.contentPosition));
                   break;

               default:
                   this.contentPosition = parseInt(scrollTo, 10) || 0;
               }

               setSize();

               return self;
           };

           function setSize()
           {
               $overview.css(posiLabel, -self.contentPosition);
           }

           function setEvents()
           {
               if (scrollNatively) {
                   $viewport.css('overflow-' + axis, 'scroll');
                   return;
               }

               if (hasTouchEvents)
               {
                   $viewport[0].ontouchstart = function(event)
                   {
                       if(1 === event.touches.length)
                       {
                           start(event.touches[0]);
                           event.stopPropagation();
                       }
                   };
               }
               else
               {
                   $viewport.bind("mousedown", start);
                   $viewport.bind("dragstart", function(event) {
                       event.preventDefault();
                       start(event);
                       return false;
                   });
               }

               $(window).resize(function()
                                {
                                    self.update("relative");
                                });

               if(self.options.wheel && window.addEventListener)
               {
                   if (window.onwheel !== undefined )
                   {
                       $container[0].addEventListener("wheel", wheel, false );
                   }
                   else if (window.onmousewheel !== undefined)
                   {
                       $container[0].addEventListener("mousewheel", wheel, false );
                   }
                   else
                   {
                       $container[0].addEventListener("DOMMouseScroll", wheel, false );
                   }
               }
               else if(self.options.wheel)
               {
                   $container[0].onmousewheel = wheel;
               }
           }

           function start(event)
           {
               $("body").addClass("noSelect");

               mousePosition      = isHorizontal ? event.pageX : event.pageY;
               oldContentPosition = self.contentPosition;

               if(hasTouchEvents)
               {
                   document.ontouchmove = function(event)
                   {
                       event.preventDefault();
                       drag(event.touches[0]);
                   };
                   document.ontouchend = end;
               }
               else
               {
                   $(document).bind("mousemove", drag);
                   $(document).bind("mouseup", end);
               }
           }

           function wheel(event)
           {
               if(self.contentRatio < 1)
               {
                   var eventObject     = event || window.event
                   ,   wheelSpeedDelta =
                       eventObject['delta' + axis.toUpperCase()] !== undefined      ?
                       -eventObject['delta' + axis.toUpperCase()] / 120          :
                       eventObject['wheelDelta' + axis.toUpperCase()] !== undefined ?
                       -eventObject['wheelDelta' + axis.toUpperCase()] / 120     :
                       eventObject.wheelDelta                                       ?
                       -eventObject.wheelDelta / 120                           :
                       -eventObject.detail / 3
                   ;

                   if (wheelSpeedDelta === 0 && !self.options.wheelLock) {
                       return; // don't process events on another axis if wheelLock is off
                   }

                   self.contentPosition -= wheelSpeedDelta * self.options.wheelSpeed;
                   self.contentPosition = Math.min((self.contentSize - self.viewportSize), Math.max(0, self.contentPosition));

                   $container.trigger("move");

                   $overview.css(posiLabel, -self.contentPosition);

                   if(self.options.wheelLock || (self.contentPosition !== (self.contentSize - self.viewportSize) && self.contentPosition !== 0))
                   {
                       eventObject = $.event.fix(eventObject);
                       eventObject.preventDefault();
                   }
               }
           }

           function drag(event)
           {
               if(self.contentRatio < 1)
               {
                   var mousePositionNew   = isHorizontal ? event.pageX : event.pageY
                   ,   mousePositionDelta = mousePositionNew - mousePosition
                   ;

                   if(self.options.scrollInvert)
                   {
                       mousePositionDelta = mousePosition - mousePositionNew;
                   }

                   self.contentPosition = mousePositionDelta + oldContentPosition;
                   self.contentPosition = Math.min((self.contentSize - self.viewportSize), Math.max(0, self.contentPosition));

                   $container.trigger("move");
                   $overview.css(posiLabel, -self.contentPosition);
                   
                   $(event.target).addClass('dragging');
                   event.preventDefault();
               }
           }

           function end(event)
           {
               if (self.contentPosition !== oldContentPosition) {
                   event.stopPropagation();
                   $(event.target).removeClass('dragging');
               }
               
               $("body").removeClass("noSelect");
               $(document).unbind("mousemove", drag);
               $(document).unbind("mouseup", end);
               document.ontouchmove = document.ontouchend = null;
           }

           return initialize();
       }
       
       $.fn[pluginName] = function(options)
       {
           return this.each(function()
                            {
                                if(!$.data(this, "plugin_" + pluginName))
                                {
                                    $.data(this, "plugin_" + pluginName, new Plugin($(this), options));
                                }
                            });
       };
   }));
