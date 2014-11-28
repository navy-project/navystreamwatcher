FROM navyproject/ruby:2.1.2
MAINTAINER Doug Johnson <doug.johnson@sage.com>

RUN mkdir /var/reactclient
WORKDIR /var/reactclient
RUN apt-get install -y python
ADD . /var/reactclient
EXPOSE 8000
CMD ["python", "-m", "SimpleHTTPServer"]
