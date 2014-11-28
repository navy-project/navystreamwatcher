(function( $ ) {

    // The global web socket.    
    var sock,
    
    // Some mock data.
        statuses = [
          "running",
          "completed",
          "waiting",
          "error",
          "destroy"
        ],
        convoys = [],
        containers = [];

    function makeid() {
      var i, text = "", possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for(i=0; i<5; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }

      return text;
    }
    
    // Mocks web socket activity by pushing new items onto
    // the mock data array and dispatching a MessageEvent.
    function mockSock() {
        
        users.push( "User " + ( users.length + 1 ) );
        
        // Dispatch the event directly on the web socket object.
        // The event data is expecting the "data" key for the message
        // data that's delivered to handlers.
        sock.dispatchEvent( new MessageEvent( "message", {
            data: {
                topic: "user.insert",
                user: _.last( users )
            }
        }));
        
        // Send another message in 3 seconds.
        _.delay( mockSock, 3000 );
        
    }
       
    $(function() {
        
        // We can create a real web socket instance with a bogus URL.
        // NOTE: This only works in Chrome as it will happily create
        // a web socket in a disconnected state. Other browsers refuse
        // to do so.
        sock = new WebSocket( "ws://mock" );
        
        // This is unchanging production code that doesn't know
        // we're mocking the web socket.
        sock.onmessage = function( message ) {
            var msg = message.data;
            if ( msg.topic === "user.insert" ) {
                $( "<li/>" ).text( msg.user )
                            .appendTo( "ul" );
            }
        };        
        
        $.each( users, function() {
            $( "<li/>" ).text( this )
                        .appendTo( "ul" );
        });
        
        // Starts the mocking activity.        
        mockSock();
        
    });
           
})( jQuery );
/*
      applyGlobalAttractor: function() {
        var attractor, convoyBodies, collider, deflector;

        deflector = Physics.behavior('body-impulse-response');
        collider = Physics.behavior('body-collision-detection');

        attractor = Physics.behavior('attractor', {
          order: 2,
          strength: 0.2
        }); //.applyTo( radar.view.find({ convoy: convoyBody.name }) );

        convoyBodies = radar.view.find({ category: 'convoy' });

        attractor.position( center );
        attractor.applyTo( convoyBodies );

        collider.applyTo( convoyBodies );
        convoyCollider = collider;

        deflector.applyTo( convoyBodies );
        convoyDeflector = deflector;
        // store reference
        globalAttractor = attractor;
        // add to the world
        radar.view.add([ attractor, collider, deflector ]);
      },
      removeGlobalAttractor: function() {
        if(globalAttractor === undefined) {
          return false;
        } else {
          radar.view.remove( globalAttractor );
          radar.view.remove( convoyCollider );
          radar.view.remove( convoyDeflector );
          globalAttractor = undefined;
          return true;
        }
      },
      updateGlobalAttractor: function( convoyBody ) {
        var scratch = Physics.scratchpad();

        // console.log( "convoy to update "+convoyBody );
        
        this.removeGlobalAttractor( convoyBody );
        this.applyGlobalAttractor( convoyBody );
        // this.updateConvoy({ convoy: convoyBody.name });
        scratch.done();
      },
*/
