declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow(options?: {
        width?: number
        height?: number
        preferInitialWindowPlacement?: boolean
        disallowReturnToOpener?: boolean
      }): Promise<Window>
      window?: Window | null
    }
  }
}

export {}
