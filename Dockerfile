FROM navyproject/ruby:2.1.2
MAINTAINER Doug Johnson <doug.johnson@sage.com>

RUN mkdir /var/eventmachine
WORKDIR /var/eventmachine
ADD . /var/eventmachine
RUN bundle install
EXPOSE 4041
CMD ["./server.rb"]
