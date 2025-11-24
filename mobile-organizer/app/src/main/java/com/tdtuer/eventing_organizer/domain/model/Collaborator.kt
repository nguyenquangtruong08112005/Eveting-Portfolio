package com.tdtuer.eventing_organizer.domain.model

data class Collaborator(
    val id: String = "",
    val organizerId: String = "",
    val name: String = "",
    val permissions: List<String> = emptyList()
)