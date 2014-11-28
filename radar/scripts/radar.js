var Radar = function(dom) {
  var canvas = dom.getElementById('visual'),
      viewWidth = window.innerWidth,
      viewHeight = window.innerHeight,
      center = Physics.vector(viewWidth, viewHeight).mult(0.5),
      renderer = Physics.renderer('canvas', {
        el: canvas,
        width: viewWidth,
        height: viewHeight,
        meta: false
      }),
      // bounds of the window
      viewportBounds = Physics.aabb(0, 0, viewWidth, viewHeight),
      viewPortEdge = Physics.behavior('edge-collision-detection', {
        aabb: viewportBounds,
        restitution: 0.99,
        cof: 0.99
      }),
      convoyEntryZones = [
        { x: viewWidth * 0.2, y: viewHeight * 0.2 },
        { x: viewWidth * 0.8, y: viewHeight * 0.2 },
        { x: viewWidth * 0.2, y: viewHeight * 0.8 },
        { x: viewWidth * 0.8, y: viewHeight * 0.8 }
      ],
      entities = {
        convoys: [],
        relations: {}
      },
      attractors = {
        global: Physics.behavior('attractor', {
          order: 1,
          strength: 0.001
        })
      },
      convoyRGB = '189, 195, 199',
      convoyBehaviors = {
        'body-impulse-response': Physics.behavior('body-impulse-response'),
        'sweep-prune': Physics.behavior('sweep-prune'),
        'convoy-collisions': Physics.behavior('body-collision-detection'),
        'lockring-collisions': Physics.behavior('body-collision-detection', { channel: 'collisions:detected:lockring' }),
        'interactive': Physics.behavior('interactive-custom', { el: canvas })
      },
      containerBehaviors = {
        'body-impulse-response': Physics.behavior('body-impulse-response'),
        'sweep-prune': Physics.behavior('sweep-prune'),
        'body-collision-detection': Physics.behavior('body-collision-detection')
      },
      selectedConvoy,
      lockRingVector = Physics.vector(center.x, 60);

  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  Physics.body('blip', 'circle', function( parent ) {
    return {
      init: function(options) {
        // console.log(options);
        parent.init.call(this,options);
      }
    };
  });

  var lockRing =  Physics.body('circle', {
    x: lockRingVector.x,
    y: lockRingVector.y,
    radius: 50,
    entity: 'lockring',
    treatment: 'static',
    styles: {
      fillStyle: 'rgba(0,0,0,0)',
      strokeStyle: 'rgba(149, 165, 166,1.0)',
      lineWidth: 0.5
    }
  });

  var Container = function( data ) {
    var convoyBody = radar.view.findOne({ name: data.convoy }),
        convoyLeft = convoyBody.state.pos.x - (convoyBody.radius * 2),
        convoyTop = convoyBody.state.pos.y - (convoyBody.radius * 2),
        convoyRight = convoyBody.state.pos.x + (convoyBody.radius * 2),
        convoyBottom = convoyBody.state.pos.y + (convoyBody.radius * 2),
        convoyWidth = convoyRight - convoyLeft,
        convoyHeight = convoyBottom - convoyTop;

    return Physics.body('blip', {
      x: convoyBody.state.pos.x,
      y: convoyBody.state.pos.y,
      // x: getRandomInt(convoyLeft, convoyRight),
      // y: getRandomInt(convoyTop, convoyBottom),
      // vx: 0.05,
      // vy: 0.05,
      radius: 5,
      mass: 100,
      styles: {
        fillStyle: 'rgba(46, 204, 113,1)'
      }
    });
  };

  Container.prototype = {
    removeContainer: function() {
      radar.view.remove( this );
    }
  };
  
  var Convoy = function() {
    var convoyEntryZone = convoyEntryZones[ getRandomInt(0, 4) ];

    return Physics.body('blip', {
      x: convoyEntryZone.x,
      y: convoyEntryZone.y,
      // x: (viewWidth * 0.5) + getRandomInt(0, 20),
      // y: (viewHeight * 0.5) + getRandomInt(0, 20),
      // x: viewWidth * 0.15,
      // y: getRandomInt(viewHeight * 0.15, viewHeight * 0.85),
      // x: getRandomInt(viewWidth * 0.05, viewWidth * 0.95),
      // y: getRandomInt(viewHeight * 0.05, viewHeight * 0.95),
      // vx: getRandomInt(1, 100) / 100,
      // vy: getRandomInt(1, 100) / 100,
      restitution: 0.99,
      radius: 30,
      mass: 4,
      styles: {
        fillStyle: 'rgba(' + convoyRGB + ',0.15)',
        strokeStyle: 'rgba(' + convoyRGB + ',0.1)',
        lineWidth: 15
      }
    });
  };

  var statusColors = {
    running:    'rgba(46, 204, 113, 1)',
    completed:  'rgba(41, 128, 185, 1)',
    waiting:    'rgba(243, 156, 18, 1)',
    error:      'rgba(231, 76, 60, 1)',
    destroy:    'rgba(189, 195, 199, 1)'
  };

  Physics.behavior('container-behavior', function( parent ) {
    return {
      init: function( options ) {
        parent.init.call( this );
        this.options( options );
      },
      connect: function( world ) {
        // console.log( "connecting" );
        world.on('manifest:container:updated', this.updateContainer, this);
        world.on('radar:container:added', this.containerAdded, this);
        world.on('integrate:positions', this.behave, this);

        world.add([
          containerBehaviors['body-impulse-response'].applyTo( [] ),
          containerBehaviors['sweep-prune'].applyTo( [] ),
          containerBehaviors['body-collision-detection'].applyTo( [] )
        ]);
      },
      disconnect: function( world ) {
        world.off('manifest:container:updated', this.updateContainer, this);
        world.off('radar:container:added', this.containerAdded, this);
        world.off('integrate:positions', this.behave, this);
      },
      containerAdded: function( data ) {
        // console.log( "container added!", data );
        // this.updateContainer( data );
      },
      removeContainer: function( containerBody ) {
        // console.log("need to remove container");
        radar.view.remove( containerBody );
        // remove from relations[convoyName].containers
        var siblings = entities.relations[containerBody.convoy].containers,
            idx = siblings.indexOf( containerBody ); 

        siblings.splice( idx, 1 );

        radar.view.emit('radar:container:removed', containerBody);
        // console.log( .indexOf( containerBody ) );
      },
      updateContainer: function( containerData ) {
        // console.log("message received");
        var scratch = Physics.scratchpad(),
            container = radar.view.findOne({ name: containerData.container }),
            allContainers = radar.view.find({ entity: 'container' });
            // fill = container.styles.fillStyle,
            // fillColors = fill.substring(fill.indexOf('(') + 1, fill.lastIndexOf(')')).split(/,\s*/);

        if( container !== false ) {

          containerBehaviors['body-impulse-response'].applyTo( allContainers );
          containerBehaviors['sweep-prune'].applyTo( allContainers );
          containerBehaviors['body-collision-detection'].applyTo( allContainers );
          // fillColors[3] -= 0.01;

          // container.styles.fillStyle = "rgba("+ fillColors.join(",") +")"
          container.styles.fillStyle = statusColors[containerData.status];
          // container.geometry.radius += 2;
          container.view = null;
          container.recalc();

          if( container.status != containerData.status ) {
            container.status = containerData.status

            var remover = function() {
              container.removeContainer();
            };

            if( container.status == "destroy" ) {
              container.countDown = setTimeout( this.removeContainer.bind(this, container), 6000 );
              container.countDownInitiated = true;
            } else if ( container.countDownInitiated ) {
              clearTimeout( container.countDown );
            }
          }

        }

        scratch.done();
      },
      behave: function( data ) {
        // console.log("behaving");
      }
    }
  });

  var selectedConvoy;

  Physics.behavior('lockring-behavior', function( parent ) {
    return {
      init: function( options ) {
        parent.init.call( this );
        this.options( options );
      },
      connect: function( world ) {
        // world.on('manifest:container:updated', this.updateContainer, this);
        world.on('collisions:detected:lockring', this.lockCheck, this);
        world.on('interact:grab:convoy', this.showLockRing, this);
        world.on('interact:release:convoy', this.hideLockRing, this);
        world.on('radar:convoy:added', this.resetBehaviors, this);
        world.on('radar:viewport:resize', this.updateLockRing, this);
      },
      disconnect: function( world ) {
        // world.off('manifest:container:updated', this.updateContainer, this);
        // world.off('radar:container:added', this.containerAdded, this);
        // world.off('integrate:positions', this.behave, this);
      },
      updateLockRing: function() {
        lockRing.state.pos = lockRingVector;
        lockRing.view = null;
        lockRing.recalc();
      },
      showLockRing: function( convoy ) {
        if( lockRing.visible === false ) {
          radar.view.addBody( lockRing );
          radar.view.addBehavior( convoyBehaviors['lockring-collisions'].applyTo( entities.convoys.concat(lockRing) ) );
          lockRing.visible = true;
        }
      },
      hideLockRing: function() {
        if( lockRing.contents === undefined ) {
          radar.view.removeBody( lockRing );
          radar.view.removeBehavior( convoyBehaviors['lockring-collisions'] );
          lockRing.visible = false;
        }          
      },
      resetBehaviors: function() {
        convoyBehaviors['lockring-collisions'];
      },
      lockCheck: function( data ) {
        var a, collision, bodyA, bodyB, targetConvoy,
            numCollisions = data.collisions.length;
        // loop through collisions
        for(var a=0; a<numCollisions; a++) {
          collision = data.collisions[a];
          // find the convoy
          targetConvoy = collision.bodyA === lockRing ? collision.bodyB : collision.bodyA;

          if(targetConvoy === selectedConvoy) {
            break;
          } else {
            targetConvoy = undefined;
          }
        }

        if( targetConvoy !== undefined ) {
          this.lockIn( targetConvoy );
        }

      },
      lockIn: function( convoy ) {
        convoy.locked = true;
        convoy.treatment = 'static';

        lockRing.contents = convoy;

        radar.view.emit('radar:lock:established');
      },
      behave: function( data ) {
        // stuff
      }
    };
  });

  Physics.behavior('convoy-interaction', function( parent ) {
    return {
      init: function( options ) {
        parent.init.call( this );
        this.options( options );
      },
      connect: function( world ) {
        world.on('interact:grab', this.grabConvoy, this);
        world.on('interact:release', this.releaseConvoy, this);
        
        convoyBehaviors['interactive'].connect( world );
      },
      disconnect: function( world ) {
        world.off('interact:grab', this.grabConvoy, this);
        world.off('interact:release', this.releaseConvoy, this);
        
        convoyBehaviors['interactive'].disconnect( world );
      },
      grabConvoy: function( data ) {
        if(data.body.entity === 'convoy') {
          selectedConvoy = data.body;
          selectedConvoy.selected = true;
          radar.view.emit('interact:grab:convoy', selectedConvoy);
        }
      },
      releaseConvoy: function( data ) {
        if(selectedConvoy) {
          radar.view.emit('interact:release:convoy', selectedConvoy);
          selectedConvoy.selected = false;
          selectedConvoy = undefined;
        }
      },
    };
  });

  Physics.behavior('convoy-behavior', function( parent ) {
    return {
      init: function( options ) {
        parent.init.call( this );
        this.options( options );
      },
      connect: function( world ) {
        // world.on('manifest:container:updated', this.updateContainer, this);
        world.on('radar:convoy:added', this.setConvoyBehavior, this);
        world.on('radar:container:added', this.updateConvoy, this);
        world.on('radar:container:removed', this.checkContainers, this);
        world.on('radar:lock:established', this.removeInteraction, this);
        world.on('radar:lock:released', this.applyInteraction, this);
        world.on('integrate:positions', this.behave, this);
        // world.on('collisions:candidates', Physics.util.throttle( this.lockCheck, 500), this);

        attractors.global.position( center );
        attractors.global.applyTo( entities.convoys );

        world.add([
          attractors.global,
          Physics.behavior('convoy-interaction'),
          convoyBehaviors['body-impulse-response'].applyTo( entities.convoys ),
          convoyBehaviors['sweep-prune'].applyTo( entities.convoys ),
          convoyBehaviors['convoy-collisions'].applyTo( entities.convoys ),
          convoyBehaviors['interactive'].applyTo( entities.convoys )
        ]);

        this.applyInteraction( world );
      },
      disconnect: function( world ) {
        // world.off('manifest:container:updated', this.updateContainer, this);
        // world.off('radar:container:added', this.containerAdded, this);
        // world.off('integrate:positions', this.behave, this);
      },
      applyInteraction: function( world ) {
        world = world || radar.view;
        Physics.behavior('convoy-interaction').connect( world );
      },
      removeInteraction: function( world ) {
        world = world || radar.view;
        Physics.behavior('convoy-interaction').disconnect( world );
      },
      grabConvoy: function( data ) {
        if(data.body.entity === 'convoy') {
          selectedConvoy = data.body;
          selectedConvoy.selected = true;
          radar.view.emit('interact:grab:convoy', selectedConvoy);
        }
      },
      releaseConvoy: function( data ) {
        if(selectedConvoy) {
          radar.view.emit('interact:release:convoy', selectedConvoy);
          selectedConvoy.selected = false;
          selectedConvoy = undefined;
        }
      },
      checkContainers: function( containerBody ) {
        var convoyRelations = entities.relations[ containerBody.convoy ];

        if( convoyRelations.containers.length == 0 ) {
          convoyRelations.countDown = setTimeout( this.removeConvoy.bind(this, containerBody.convoy), 6000 );
          convoyRelations.countDownInitiated = true;
        } else if( convoyRelations.countDownInitiated ) {
          clearTimeout( convoyRelations.countDown );
        }
      },
      removeConvoy: function( convoyName ) {
        radar.view.remove( entities.convoys[ entities.relations[ convoyName ].convoyId ] );
      },
      setConvoyBehavior: function( convoyBody ) {
        this.updateConvoyBehaviors();
        this.applyConvoyAttractor( convoyBody );
      },
      updateConvoyBehaviors: function() {
        attractors.global.applyTo( entities.convoys );
        convoyBehaviors['body-impulse-response'].applyTo( entities.convoys );
        convoyBehaviors['sweep-prune'].applyTo( entities.convoys );
        convoyBehaviors['convoy-collisions'].applyTo( entities.convoys );
        convoyBehaviors['lockring-collisions'].applyTo( entities.convoys.concat(lockRing) );
        convoyBehaviors['interactive'].applyTo( entities.convoys );
      },
      applyConvoyAttractor: function( convoyBody ) {
        var attractor = Physics.behavior('attractor', {
          order: 1,
          strength: 0.001,
          convoyTarget: convoyBody.name
        });

        attractor.position( convoyBody.state.pos );
        attractor.applyTo( entities.relations[convoyBody.name].containers );

        // store reference
        attractors[convoyBody.name] = attractor;
        // add to the world
        radar.view.add( attractor );
      },
      removeConvoyAttractor: function( convoyBody ) {
        var attractor = attractors[convoyBody.name];

        if(attractor === undefined) {
          return false;
        } else {
          radar.view.remove( attractor );
          delete attractor;
          return true;
        }
      },
      updateConvoy: function( containerData ) {
        var convoyName = containerData.convoy,
            convoyRelations = entities.relations[convoyName];
        // console.log(" --- ");
        // console.log( entities.relations[containerData.convoy].containers );
        // console.log( attractors[containerData.convoy].getTargets() );
        attractors[convoyName].applyTo( convoyRelations.containers );
        convoyRelations['edge-collision-detection'].applyTo( convoyRelations.containers );
        // var scratch = Physics.scratchpad(),
        //     convoyBody = radar.view.findOne({ name: containerData.convoy });

        // console.log( "convoy to update "+convoyBody );
        
        // this.removeConvoyAttractor( convoyBody );
        // this.applyConvoyAttractor( convoyBody );
        // scratch.done();
      },
      attractors: attractors,
      behave: function( data ) {
        var c, currentConvoy, attractor,
            convoysList = entities.convoys,
            numConvoys = convoysList.length,
            convoyRelations;

        for (c=0; c<numConvoys; c++) {
          currentConvoy = convoysList[c];
          convoyRelations = entities.relations[currentConvoy.name];

          if( attractors[currentConvoy.name].position() != currentConvoy.state.pos ) {
            attractors[currentConvoy.name].position( currentConvoy.state.pos );
          }

          convoyRelations.bounds.x = currentConvoy.state.pos.x;
          convoyRelations.bounds.y = currentConvoy.state.pos.y;
          convoyRelations['edge-collision-detection'].setAABB( convoyRelations.bounds );
        }

        // console.log("behaving");
        // var i, convoys = radar.view.find({ category: 'convoy' }),
        //     numConvoys = convoys.length;

        // for( i=0; i<numConvoys; i++ ) {
        //   this.updateConvoy({ convoy: convoys[i].name });
        // }
      }
    }
  });

  var applyConvoyBounds = function( convoyBody ) {
      var convoyBounds = Physics.aabb(convoyBody.radius * 2, convoyBody.radius * 2, convoyBody.state.pos),
          convoyEdgeCollision = Physics.behavior('edge-collision-detection', {
            aabb: convoyBounds,
            restitution: 0.99,
            cof: 0.99
          });

      entities.relations[convoyBody.name].bounds = convoyBounds;
      entities.relations[convoyBody.name]['edge-collision-detection'] = convoyEdgeCollision;

      radar.view.add ( convoyEdgeCollision.applyTo( entities.relations[convoyBody.name].containers ) );
  };

  var addContainer = function( containerData ) {
    // create a new container entity
    var container = new Container( containerData );
    container.name = containerData.container;
    container.convoy = containerData.convoy;
    container.entity = 'container';


    // store a reference in the entities object
    entities.relations[containerData.convoy].containers.push( container );

    // applyConvoyBounds( containerData );

    // update the radar
    radar.view.add( container );
    radar.view.emit('radar:container:added', container);
  };

  var addConvoy = function( convoyName ) {
    // create a new convoy entity
    var convoy = new Convoy();
    convoy.name = convoyName;
    convoy.entity = 'convoy';

    // store a reference in the entities object
    entities.convoys.push( convoy );
    entities.relations[convoyName] = {
      convoyId: entities.convoys.indexOf( convoy ),
      containers: []
    };

    applyConvoyBounds( convoy );

    // update the radar
    radar.view.add( convoy );
    radar.view.emit('radar:convoy:added', convoy);
  };

  var radar = {
    attractors: attractors,
    entities: entities,
    view: Physics(function (world) {

      // subscribe to events
      world.on({
        'step': function() { world.render(); },
        'manifest:convoy:added': addConvoy,
        'manifest:container:added': addContainer
      });

      // apply settings to world
      world.add([
        renderer,
        Physics.behavior('container-behavior'),
        Physics.behavior('convoy-behavior'),
        Physics.behavior('lockring-behavior'),
        viewPortEdge,
      ]);

      // subscribe to ticker to advance the simulation
      Physics.util.ticker.on( function( time, dt ){
        world.step( time );
      });
      
      // start the ticker
      Physics.util.ticker.start();
    })
  };

  window.addEventListener('resize', function () {

    viewWidth = window.innerWidth;
    viewHeight = window.innerHeight;

    renderer.el.width = viewWidth;
    renderer.el.height = viewHeight;
    
    center = Physics.vector(viewWidth, viewHeight).mult(0.5);
    lockRingVector = Physics.vector(center.x, 60);

    radar.view.emit('radar:viewport:resize');

    viewportBounds = Physics.aabb(0, 0, viewWidth, viewHeight);
    // update the boundaries
    viewPortEdge.setAABB(viewportBounds);
    
  }, true);

  return radar;

}(document);
