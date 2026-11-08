import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post, put, del } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { CreateGroupBody, UpdateGroupBody, IGroup, AddGroupMembersBody } from '@/types';
import { toast } from '@/components/ui/Toast';

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGroupBody) => post<{ data: IGroup }>(endpoint.groups, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      toast('Group created.', 'success');
    },
    onError: () => {
      toast('Couldn’t create the group. Try again.', 'error');
    },
  });
}

export function useUpdateGroup(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateGroupBody) => put<{ data: IGroup }>(endpoint.group.replace(':id', id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      toast('Group updated.', 'success');
    },
    onError: () => {
      toast('Couldn’t update the group. Try again.', 'error');
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => del(endpoint.group.replace(':id', id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      toast('Group deleted.', 'success');
    },
    onError: () => {
      toast('Couldn’t delete the group. Try again.', 'error');
    },
  });
}

export function useAddGroupMembers(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddGroupMembersBody) => post(endpoint.groupMembers.replace(':id', groupId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      toast('Members updated', 'success');
    },
    onError: () => {
      toast('Couldn’t update the group members. Try again.', 'error');
    },
  });
}

export function useRemoveGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, beneficiaryId }: { groupId: string; beneficiaryId: string }) => 
      del(endpoint.groupMember.replace(':id', groupId).replace(':beneficiaryId', beneficiaryId)),
    onSuccess: () => {
      // Refresh both to ensure our UI list state filters properly
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      queryClient.invalidateQueries({ queryKey: queryKeys.beneficiaries });
      toast('Member removed', 'success');
    },
    onError: () => {
      toast('Couldn’t remove the member. Try again.', 'error');
    },
  });
}

/** Saves a group's membership in one go: adds the new people, removes the unticked ones. */
export function useSetGroupMembers(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ add, remove }: { add: string[]; remove: string[] }) => {
      if (add.length) await post(endpoint.groupMembers.replace(':id', groupId), { beneficiaryIds: add });
      await Promise.all(remove.map((beneficiaryId) =>
        del(endpoint.groupMember.replace(':id', groupId).replace(':beneficiaryId', beneficiaryId))));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      queryClient.invalidateQueries({ queryKey: queryKeys.beneficiaries });
    },
    onSuccess: () => toast('Group members saved.', 'success'),
    onError: () => toast('Couldn’t save the group members. Try again.', 'error'),
  });
}
