export function getManagePlanProCardStyle() {
  return {
    alignSelf: 'stretch',
    marginTop: 24,
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 28,
    overflow: 'hidden',
  } as const;
}

export function getManagePlanProCardImageStyle() {
  return {borderRadius: 32} as const;
}
