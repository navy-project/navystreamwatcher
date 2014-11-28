var MESSENGER = function(dom, radar, socket, manifest) {
  var ConvoyBox, ConvoyList, ContainerList, Container;

  ConvoyBox = React.createClass({
    getInitialState: function() {
      return {data: []};
    },

    componentDidMount: function() {
      this.watchForContainerChanges();
    },

    watchForContainerChanges: function() {
      this.setState({ data: manifest.data().convoys });
      var socket = this.props.socketService;

      socket.onmessage = function(message) {
        var record = JSON.parse(message.data),
            stateData = this.state.data;

        dom.getElementById('message').innerHTML = message.data;
        manifest.update( Object.create(record) );

        this.setState(manifest.data().convoys);
      }.bind(this);
    },

    render: function() {
      return (
      <div className="convoyBox">
        <ConvoyList data={this.state.data} />
      </div>
      );
    }
  });

  ConvoyList = React.createClass({
    render: function() {
      var convoyNodes = this.props.data.map(function (convoy, index) {
        return (<Convoy key={index} name={convoy.name} containers={convoy.containers} />);
      });

      return (<div className="convoyList">{convoyNodes}</div>);
    }
  });

  Convoy = React.createClass({
    render: function() {
      return (
      <div className="convoy">
        <span className="convoyName">{this.props.name}</span>
        <ContainerList containers={this.props.containers} />
      </div>
      );
    }
  });

  ContainerList = React.createClass({
    render: function() {
      var containerNodes = this.props.containers.map(function (container, index) {
        return (<Container key={index} sha={container.container} name={container.name} status={container.status} />);
      });

      return (<div className="containerList">{containerNodes}</div>);
    }
  });

  Container = React.createClass({
    render: function() {
      return (<span className={"container "+this.props.status}>{this.props.name}</span>);
    }
  });

  React.render( <ConvoyBox socketService={socket.service} />, dom.getElementById('content') );

  return {
    handleChange: ConvoyBox
  };

}(document, Radar, socket, ConvoyManifest);
