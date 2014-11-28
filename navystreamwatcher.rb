require 'em-http-request'

class NavyStreamWatcher

  def initialize(url)
    @url = url
    listen
  end

  def onchange(&action_block)
    @action_block = action_block
  end

  def listen

    http = EM::HttpRequest.new(@url, :inactivity_timeout => 0).get

    http.errback { p http.error; EM.stop }

    http.stream { |chunk| @action_block.call chunk }

  end

end
