import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AuthRedirecting } from './AuthRedirecting'

describe('AuthRedirecting', () => {
  it('role=status のローダーを表示する', () => {
    render(<AuthRedirecting />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('デフォルトラベル「ログインが必要です。ホームへ戻ります…」を表示する', () => {
    render(<AuthRedirecting />)
    expect(screen.getByText('ログインが必要です。ホームへ戻ります…')).toBeInTheDocument()
  })

  it('label プロップを渡すとその文言を表示する', () => {
    render(<AuthRedirecting label="ホームへ戻ります…" />)
    expect(screen.getByText('ホームへ戻ります…')).toBeInTheDocument()
    expect(screen.queryByText('ログインが必要です。ホームへ戻ります…')).not.toBeInTheDocument()
  })

  it('ラッパーが min-h-[60vh] の中央揃えレイアウトになっている', () => {
    render(<AuthRedirecting />)
    const wrapper = screen.getByRole('status').parentElement as HTMLElement
    expect(wrapper).toHaveClass('flex', 'items-center', 'justify-center', 'min-h-[60vh]')
  })
})
