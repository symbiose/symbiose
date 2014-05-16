<?php
namespace FSi\Component\ACL;

interface ACLInterface
{
    public function addPermission(PermissionInterface $permission);

    public function removePermission(PermissionInterface $permission);

    public function hasPermission(PermissionInterface $permission);

    public function addRole(RoleInterface $role, array $parentRoles = array());

    public function removeRole(RoleInterface $role);

    public function hasRole(RoleInterface $role);

    public function addRoleParent(RoleInterface $role, RoleInterface $parentRole);

    public function removeRoleParent(RoleInterface $role, RoleInterface $parentRole);

    public function removeRoleParents(RoleInterface $role);

    public function hasRoleParent(RoleInterface $role, RoleInterface $parentRole);

    public function getRoleParents(RoleInterface $role);

    public function getRoleChildren(RoleInterface $parentRole);

    public function getRolesByClass($className);

    public function addResource(ResourceInterface $resource, array $parentResources = array());

    public function removeResource(ResourceInterface $resource);

    public function hasResource(ResourceInterface $resource);

    public function addResourceParent(ResourceInterface $resource, ResourceInterface $parentResource);

    public function removeResourceParent(ResourceInterface $resource, ResourceInterface $parentResource);

    public function removeResourceParents(ResourceInterface $resource);

    public function hasResourceParent(ResourceInterface $resource, ResourceInterface $parentResource);

    public function getResourceParents(ResourceInterface $resource);

    public function getResourceChildren(ResourceInterface $parentResource);

    public function getResourcesByClass($className);

    public function addACE(ACEInterface $ace);

    public function removeACE(ACEInterface $ace);

    public function hasACE(ACEInterface $ace);

    /**
     * Check access right to the specified permission of the specified resource for the specified role.
     *
     * This method searches ACEs directly associated with specified params. If this gives no results (grant or revoke), then it
     * searches ACEs up in the hierarchy tree of resources starting from the specified one. If again this gives no results, then
     * it searches ACEs up in the hierarchy of roles starting from specified one. If none results are found then false is
     * returned so the access is revoked.
     *
     * @param RoleInterface $role
     * @param ResourceInterface $resource
     * @param PermissionInterface $permission
     * @param array $params
     * @return bool
     */
    public function isAllowed(RoleInterface $role, ResourceInterface $resource, PermissionInterface $permission, array $params = array());

}
