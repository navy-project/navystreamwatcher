var ConvoyManifest = function(radar) {
  var manifest = { convoys: [] };

  var counter = 0;

  var addConvoy = function( name ) {
    var numConvoys = manifest.convoys.push({
      name: name,
      containers: []
    });

    radar.view.emit('manifest:convoy:added', name );

    return manifest.convoys[numConvoys - 1];
  };

  var addContainer = function( convoy, data ) {
    var numContainers = convoy.containers.push( data );
    
    radar.view.emit('manifest:container:added', data);

    return convoy.containers[numContainers - 1];
  };

  var updateContainerStatus = function( container, status ) {
    // console.log("updating manifest");
    container.status = status;
    radar.view.emit('manifest:container:updated', container);
  };

  var checkConvoy = function( name ) {
    var numConvoys = manifest.convoys.length,
        convoy, idx;

    for ( idx=0; idx<numConvoys; idx++ ) {
      if( manifest.convoys[idx].name == name ) {
        convoy = manifest.convoys[idx];
        break;
      }
    }

    if ( convoy === undefined ) {
      convoy = addConvoy( name );
    }

    return convoy;
  };

  var checkContainer = function( convoy, data ) {
    var containerGroup = convoy.containers,
        numContainers = containerGroup.length,
        container, idx;

    for ( idx=0; idx<numContainers; idx++ ) {
      if ( containerGroup[idx].container == data.container ) {
        container = containerGroup[idx];
        break;
      }
    }

    if ( container === undefined ) {
      container = addContainer( convoy, data );
    }

    return container;
  };

  return {
    data: function() {
      return manifest;        
    },
    update: function( data ) {
      data.container = data.name;
      data.name = data.name.replace( data.convoy + "_", "" );

      var convoyToUpdate = checkConvoy( data.convoy ),
          containerToUpdate = checkContainer( convoyToUpdate, data );

      updateContainerStatus( containerToUpdate, data.status ); 
    }
  };
}(Radar);
