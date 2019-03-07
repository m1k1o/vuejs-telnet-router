var rc2json = require('./rc2json.js');

var running_config = `sh run
Building configuration...

Current configuration : 2629 bytes
!
upgrade fpd auto
version 12.4
service timestamps debug datetime msec
service timestamps log datetime msec
no service password-encryption
!
hostname CE1
!
boot-start-marker
boot-end-marker
!
logging message-counter syslog
!
no aaa new-model
ip source-route
no ip icmp rate-limit unreachable
ip cef
!
!
!
!
no ip domain lookup
no ipv6 cef
!
multilink bundle-name authenticated
!
!
!
!
!
!
!
!
!
!
!
!
!
!
!
!
archive
 log config
  hidekeys
! 
!
!
!
!
ip tcp synwait-time 5
!
!
!
!
interface Loopback1
 ip address 50.50.50.1 255.255.255.0
 ip ospf network point-to-point
!
interface FastEthernet0/0
 description Link-to-PC1
 ip address 10.10.10.1 255.255.255.0
 duplex auto
 speed auto
!
interface FastEthernet0/1
 no ip address
 shutdown
 duplex auto
 speed auto
!
interface Serial1/0
 description Link-to-ISP1
 ip address 172.16.0.1 255.255.255.240
 serial restart-delay 0
!
interface Serial1/1
 description Link-to-ISP2
 ip address 172.16.0.17 255.255.255.240
 serial restart-delay 0
!
interface Serial1/2
 no ip address
 shutdown
 serial restart-delay 0
!
interface Serial1/3
 no ip address
 shutdown
 serial restart-delay 0
!
router eigrp 1
 redistribute ospf 1 metric 10 10 10 10 1500 route-map l1_from_ospf_to_eigrp
 network 10.10.10.0 0.0.0.255
 network 172.16.0.16 0.0.0.15
 distribute-list prefix deny_serial_networks out
 distribute-list prefix deny_serial_networks in
 no auto-summary
!
router ospf 1
 log-adjacency-changes
 network 10.10.10.0 0.0.0.255 area 0
 network 50.50.50.0 0.0.0.255 area 0
 network 172.16.0.0 0.0.0.15 area 0
 distribute-list prefix deny_serial_networks out
 distribute-list prefix deny_serial_networks in
!
ip forward-protocol nd
no ip http server
no ip http secure-server
!
!
!
!
ip prefix-list CE2_local_network seq 5 permit 20.20.20.0/24
!
ip prefix-list deny_serial_networks seq 5 deny 172.16.0.0/28
ip prefix-list deny_serial_networks seq 10 deny 172.16.0.16/28
ip prefix-list deny_serial_networks seq 15 deny 172.16.0.32/28
ip prefix-list deny_serial_networks seq 20 deny 172.16.0.48/28
ip prefix-list deny_serial_networks seq 25 permit 0.0.0.0/0 le 32
!
ip prefix-list l1_network seq 5 permit 50.50.50.0/24
no cdp log mismatch duplex
!
!
!
!
route-map l1_from_ospf_to_eigrp permit 10
 match ip address prefix-list l1_network
!
route-map forward_to_PC2 permit 10
 match ip address prefix-list CE2_local_network
 set interface Serial1/0
!
!
!
control-plane
!
!
!
!
!
!
!
gatekeeper
 shutdown
!
!
line con 0
 exec-timeout 0 0
 privilege level 15
 logging synchronous
 stopbits 1
line aux 0
 exec-timeout 0 0
 privilege level 15
 logging synchronous
 stopbits 1
line vty 0 4
 login
!
end

CE1#`;

console.log(JSON.stringify(rc2json(running_config, true), null, 4));
