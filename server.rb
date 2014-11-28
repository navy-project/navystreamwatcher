#!/usr/bin/env ruby
require 'em-websocket'
require_relative 'navystreamwatcher'

navystream_server = ARGV.shift || "172.17.42.1"

EventMachine.run {
  @channel = EM::Channel.new

  URL="http://#{navystream_server}:4040/events"

  EventMachine::WebSocket.start(:host => "0.0.0.0", :port => 4041, :debug => true) do |ws|

    sid = 0

    ws.onopen {
      sid = @channel.subscribe { |msg| ws.send msg }
    }

    ws.onmessage { |msg|
      @channel.push msg
    }

    ws.onclose {
      @channel.unsubscribe(sid)
    }

  end

  navystream_watcher = NavyStreamWatcher.new(URL)
  navystream_watcher.onchange do |change|
    @channel.push change
  end 

  puts "Server started"
}

