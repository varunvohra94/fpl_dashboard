output "network_id" {
  description = "VPC Network ID"
  value       = google_compute_network.vpc.id
}

output "subnet_id" {
  description = "Subnet ID"
  value       = google_compute_subnetwork.subnet.id
}

output "vpc_connector_id" {
  description = "Serverless VPC Access Connector ID"
  value       = google_vpc_access_connector.connector.id
}

output "private_vpc_connection" {
  description = "VPC Peering connection resource"
  value       = google_service_networking_connection.private_vpc_connection
}
